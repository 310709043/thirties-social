import React, { useState, useEffect, useRef } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, Alert,
  ScrollView, StyleSheet, KeyboardAvoidingView, Platform, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { DIRECTIONS } from '../lib/theme';
import { t } from '../lib/copy';
import { VaporBackground, GlassCard, CountdownBar, Cap, WickGlyph, PhotoVeil, FadeInUp, TypingIndicator } from '../components/ui';
import { hapticMedium } from '../lib/haptics';
import { Identity } from '../components/identity/Identity';
import { ColorAdjLabel } from '../components/identity/Identity';
import { useAppStore, setWicks as saveWicks, trackConversation, recordMatch } from '../hooks/useAppStore';
import { subscribeToConversationMessages, sendConversationMessage, spendWicks, getCurrentUid, endConversation, DbConvMessage, setTyping, subscribeToTyping, subscribeToConversationEnded } from '../lib/db';
import { filterMessage } from '../lib/filter';
import { analytics } from '../lib/analytics';
import { pickImage, uploadVeiledPhoto, getVeiledPhoto } from '../lib/photos';
import * as ScreenCapture from 'expo-screen-capture';

type Props = NativeStackScreenProps<RootStackParamList, 'Chat'>;

const TOTAL_SECONDS = 30 * 60;
/** Minimum messages exchanged before a veiled photo can be lifted (anti photo-grab). */
const VEIL_MIN_MESSAGES = 10;

export default function ChatScreen({ navigation, route }: Props) {
  const { seed, direction, lang, identityKind, wicks, autoFilter, slowMode } = useAppStore();
  const p = DIRECTIONS[direction];
  const otherSeed = route.params?.otherSeed;
  const conversationId = (route.params as any)?.conversationId as string | undefined;
  const matchCharge = (route.params as any)?.matchCharge as boolean | undefined;
  const chargedRef = useRef(false);

  // Guard: navigate back if required params are missing
  if (!otherSeed || !conversationId) {
    return (
      <VaporBackground p={p} style={{ flex: 1 }}>
        <SafeAreaView style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 16, color: p.muted }}>
            {lang === 'en' ? 'Conversation not found' : '找不到對話'}
          </Text>
          <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 16 }}>
            <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: p.accent }}>
              {lang === 'en' ? 'Go back' : '返回'}
            </Text>
          </TouchableOpacity>
        </SafeAreaView>
      </VaporBackground>
    );
  }

  ScreenCapture.usePreventScreenCapture();

  const [remaining, setRemaining] = useState(TOTAL_SECONDS);
  const [realMessages, setRealMessages] = useState<DbConvMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [showVeilSheet, setShowVeilSheet] = useState(false);
  const [veilSent, setVeilSent] = useState(false);
  const [selectedPhotoUri, setSelectedPhotoUri] = useState<string | null>(null);
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherLeft, setOtherLeft] = useState(false);
  const iLeftRef = useRef(false);
  const [pausing, setPausing] = useState(false);
  const pauseTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pauseReadyRef = useRef(false);
  const scrollRef = useRef<ScrollView>(null);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!conversationId) return;
    trackConversation(conversationId);
    analytics.conversationStart(conversationId);
    return subscribeToConversationMessages(conversationId, setRealMessages);
  }, [conversationId]);

  // Subscribe to other user's typing state
  useEffect(() => {
    if (!conversationId) return;
    const uid = getCurrentUid();
    if (!uid) return;
    return subscribeToTyping(conversationId, uid, setOtherTyping);
  }, [conversationId]);

  // Tell the user when the other person leaves (or the chat is gone), instead of
  // letting them keep talking to no one. Ignore our own leave (iLeftRef).
  useEffect(() => {
    if (!conversationId) return;
    return subscribeToConversationEnded(conversationId, reason => {
      if (reason && !iLeftRef.current) setOtherLeft(true);
    });
  }, [conversationId]);

  useEffect(() => {
    const id = setInterval(() => {
      setRemaining(r => {
        if (r <= 1) {
          clearInterval(id);
          iLeftRef.current = true;
          (async () => {
            if (conversationId) {
              await endConversation(conversationId, 'timer_expired');
              analytics.conversationEnd(conversationId, 'timer_expired');
            }
            navigation.replace('Close');
          })();
          return 0;
        }
        // Show warning at 60s and 10s
        if (r === 60) {
          hapticMedium();
        }
        return r - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const mm = String(Math.floor(remaining / 60)).padStart(2, '0');
  const ss = String(remaining % 60).padStart(2, '0');
  const progress = remaining / TOTAL_SECONDS;

  // Debounced typing indicator
  const handleInputChange = (text: string) => {
    setInputText(text);
    if (!conversationId) return;
    if (text.length > 0) {
      setTyping(conversationId, true);
      // Clear previous timeout
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
      // Auto-stop typing after 3 seconds of inactivity
      typingTimeoutRef.current = setTimeout(() => {
        setTyping(conversationId, false);
      }, 3000);
    } else {
      setTyping(conversationId, false);
    }
  };

  // Slow mode (opt-in): between 22:00-05:00 hold each message a few seconds
  // before it goes out — a small pause to reconsider late-night words.
  const isNightSlow = () => {
    if (!slowMode) return false;
    const h = new Date().getHours();
    return h >= 22 || h < 5;
  };

  const sendMessage = async () => {
    if (pausing) return;
    if (!inputText.trim()) return;
    if (isNightSlow() && !pauseReadyRef.current) {
      setPausing(true);
      pauseTimerRef.current = setTimeout(() => {
        pauseReadyRef.current = true;
        setPausing(false);
        sendMessage();
      }, 3000);
      return;
    }
    pauseReadyRef.current = false;
    const check = autoFilter ? filterMessage(inputText.trim()) : { blocked: false };
    if (check.blocked) {
      Alert.alert(
        lang === 'en' ? 'Message blocked' : '\u8A0A\u606F\u5DF2\u88AB\u904E\u6FFE',
        lang === 'en' ? 'This message contains content that may be harmful.' : '\u9019\u5247\u8A0A\u606F\u5305\u542B\u53EF\u80FD\u50B7\u5BB3\u4ED6\u4EBA\u7684\u5167\u5BB9\u3002',
      );
      return;
    }
    if (conversationId) {
      const ok = await sendConversationMessage({ conversationId, content: inputText.trim() });
      if (!ok) {
        Alert.alert(
          lang === 'en' ? 'Failed to send' : '\u9001\u51FA\u5931\u6557',
          lang === 'en' ? 'Please try again.' : '\u8ACB\u7A0D\u5F8C\u518D\u8A66\u4E00\u6B21\u3002',
        );
        return;
      }
      analytics.messageSend(conversationId);
      // A match "counts" only once you actually speak — charge on the first
      // message you send, never for entering an empty chat.
      if (matchCharge && !chargedRef.current) {
        chargedRef.current = true;
        // Await so a paid match actually settles (and a failed charge doesn't
        // silently let the match go free); only mark charged once it succeeds.
        const charged = await recordMatch();
        if (!charged) chargedRef.current = false;
      }
      // Clear typing state after sending
      setTyping(conversationId, false);
      if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    }
    setInputText('');
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
  };

  // Clear the slow-mode timer if the chat unmounts mid-pause.
  useEffect(() => () => { if (pauseTimerRef.current) clearTimeout(pauseTimerRef.current); }, []);

  const displayMessages = realMessages.map(msg => ({
    from: msg.senderId === getCurrentUid() ? 'me' : 'other',
    zh: msg.content, en: msg.content, age: 0,
    messageType: msg.messageType ?? 'text',
    photoId: msg.messageType === 'photo' ? msg.content : null,
  }));

  return (
    <VaporBackground p={p} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={0}
        >
          {/* COUNTDOWN HEADER */}
          <View style={[styles.header, {
            backgroundColor: p.dark ? 'rgba(13,18,36,0.92)' : 'rgba(255,255,255,0.75)',
            borderBottomWidth: 0.5, borderBottomColor: p.line,
          }]}>
            {/* Back */}
            <View style={styles.headerRow}>
              <TouchableOpacity
                onPress={() => {
                  iLeftRef.current = true;
                  if (conversationId) {
                    endConversation(conversationId, 'user_ended');
                    analytics.conversationEnd(conversationId, 'user_ended');
                  }
                  navigation.replace('Close');
                }}
                style={styles.backBtn}
              >
                <Text style={{ color: p.muted, fontSize: 20 }}>‹</Text>
              </TouchableOpacity>

              {/* Other person */}
              <View style={styles.otherIdentity}>
                <Identity kind={identityKind} seed={otherSeed} size={28} palette={p} lang={lang} trust={0.25} />
                <ColorAdjLabel seed={otherSeed} lang={lang} palette={p} />
              </View>

              {/* Safety */}
              <TouchableOpacity onPress={() => navigation.push('Safety', { reportedUserId: otherSeed, conversationId })} style={styles.safetyBtn}>
                <Text style={{ color: p.muted, fontSize: 18 }}>ⓘ</Text>
              </TouchableOpacity>
            </View>

            {/* Countdown bar */}
            <View style={styles.countdown}>
              <View style={styles.countdownRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 7 }}>
                  <View style={{ width: 5, height: 5, borderRadius: 5, backgroundColor: remaining <= 60 ? p.danger : p.accent }} />
                  <Cap p={p}>{t('chatRemaining', lang)}</Cap>
                </View>
                <Text style={[styles.timer, { color: remaining <= 60 ? p.danger : p.ink }]}>
                  {mm}<Text style={{ opacity: 0.4 }}>:</Text>{ss}
                </Text>
              </View>
              <CountdownBar p={p} progress={progress} />
              <Text style={[styles.dissolveNote, { color: remaining <= 60 ? p.danger : p.muted }]}>
                {remaining <= 60
                  ? (lang === 'en' ? 'conversation dissolves soon' : '對話即將消散')
                  : (lang === 'en'
                    ? 'when this reaches zero, the entire conversation dissolves.'
                    : '歸零之後，整段對話會全部消散。')}
              </Text>
            </View>
          </View>

          {/* MESSAGES */}
          <View style={{ flex: 1 }}>
          {/* Anti-screenshot watermark */}
          <View style={styles.watermarkLayer} pointerEvents="none">
            {Array.from({ length: 6 }).map((_, i) => (
              <View key={i} style={styles.watermarkRow}>
                {Array.from({ length: 3 }).map((_, j) => (
                  <Text key={j} style={[styles.watermarkText, { color: p.ink }]}>
                    {seed.slice(0, 6)}
                  </Text>
                ))}
              </View>
            ))}
          </View>
          <ScrollView
            ref={scrollRef}
            style={styles.messages}
            contentContainerStyle={{ padding: 20, gap: 14 }}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
          >
            <Text style={[styles.openNote, { color: p.muted }]}>
              {lang === 'en' ? 'messages dissolve when the timer ends' : '\u8A08\u6642\u7D50\u675F\u5F8C\u8A0A\u606F\u6703\u5168\u90E8\u6D88\u6563'}
            </Text>

            {displayMessages.length === 0 && (
              <FadeInUp delay={120} distance={10}>
                <View style={styles.emptyState}>
                  {/* two souls just met \u2014 facing rings */}
                  <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 18 }}>
                    <Identity kind={identityKind} seed={seed} size={34} palette={p} lang={lang} trust={0.3} />
                    <View style={{ width: 26, height: 0.5, backgroundColor: p.line, marginHorizontal: -2 }} />
                    <Identity kind={identityKind} seed={otherSeed} size={34} palette={p} lang={lang} trust={0.2} />
                  </View>
                  <Text style={[styles.emptyTitle, { color: p.ink }]}>
                    {lang === 'en' ? 'You found each other.' : '\u4F60\u5011\u9047\u898B\u4E86\u5F7C\u6B64\u3002'}
                  </Text>
                  <Text style={[styles.emptyBody, { color: p.muted }]}>
                    {lang === 'en'
                      ? 'Say something first \u2014 they can hear you. Nothing here is kept.'
                      : '\u5148\u958B\u53E3\u8AAA\u9EDE\u4EC0\u9EBC\uFF0C\u5C0D\u65B9\u807D\u5F97\u5230\u3002\u9019\u88E1\u7559\u4E0D\u4E0B\u4EFB\u4F55\u6771\u897F\u3002'}
                  </Text>
                </View>
              </FadeInUp>
            )}

            {displayMessages.map((m, i) => (
              <FadeInUp key={i} distance={10} duration={260} delay={Math.min(i * 25, 150)}>
                <ChatBubble p={p} m={m} lang={lang} wicks={wicks} conversationId={conversationId}
                  canRevealVeil={displayMessages.length >= VEIL_MIN_MESSAGES}
                  onReport={m.from !== 'me' ? () => navigation.push('Safety', { reportedUserId: otherSeed, conversationId }) : undefined} />
              </FadeInUp>
            ))}

          </ScrollView>
          </View>

          {/* Typing indicator */}
          {otherTyping && (
            <View style={styles.typingRow}>
              <Identity kind={identityKind} seed={otherSeed} size={20} palette={p} lang={lang} trust={0.25} />
              <View style={[styles.typingBubble, { backgroundColor: p.surface, borderColor: p.line, borderBottomLeftRadius: 6 }]}>
                <TypingIndicator color={p.muted} size={5} />
              </View>
            </View>
          )}

          {/* COMPOSER */}
          <View style={styles.composer}>
            {otherLeft ? (
              // The other person left — say so, and offer a clean exit instead of
              // letting the user keep typing into a conversation with no one there.
              <View style={[styles.veilBar, { backgroundColor: p.surface, borderColor: p.line, justifyContent: 'space-between' }]}>
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: p.muted, flex: 1 }}>
                  {lang === 'en' ? 'The other person has left this conversation.' : '對方已離開這段對話。'}
                </Text>
                <TouchableOpacity onPress={() => { iLeftRef.current = true; navigation.replace('Close'); }}>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: p.accent }}>
                    {lang === 'en' ? 'Leave' : '離開'}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
            <>
            {/* Slow-mode buffer note */}
            {pausing && (
              <View style={[styles.veilBar, { backgroundColor: p.surface, borderColor: p.line }]}>
                <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 12, color: p.muted, flex: 1, textAlign: 'center' }}>
                  {lang === 'en' ? 'breathe — your message sends in a moment' : '深呼吸⋯訊息稍候送出'}
                </Text>
              </View>
            )}
            {/* Photo veil bar */}
            <TouchableOpacity onPress={() => setShowVeilSheet(true)}
              style={[styles.veilBar, { backgroundColor: p.accentSoft, borderColor: p.accent + '30' }]}>
              <WickGlyph size={12} color={p.accent} />
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: p.inkSoft, flex: 1 }}>
                {lang === 'en' ? 'send a veiled photo — they reveal it with wicks' : '傳送帶紗照片，對方用燭芯揭開'}
              </Text>
              <Text style={{ fontFamily: 'Inter-Regular', fontSize: 10, color: p.muted }}>
                {lang === 'en' ? '3 wicks' : '3 芯'}
              </Text>
            </TouchableOpacity>
            <GlassCard p={p} padding={6} radius={28}
              style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
              <TextInput
                value={inputText}
                onChangeText={handleInputChange}
                placeholder={t('chatPlaceholder', lang)}
                placeholderTextColor={p.muted}
                style={[styles.input, { color: p.ink }]}
                onSubmitEditing={sendMessage}
                returnKeyType="send"
              />
              <TouchableOpacity
                onPress={sendMessage}
                disabled={pausing}
                style={[styles.sendBtn, { backgroundColor: p.ink, opacity: pausing ? 0.4 : 1 }]}
              >
                <Text style={{ color: p.dark ? '#1a1530' : '#fff', fontSize: 16 }}>{pausing ? '⋯' : '↑'}</Text>
              </TouchableOpacity>
            </GlassCard>
            </>
            )}
          </View>

          {/* PHOTO VEIL SHEET */}
          {showVeilSheet && (
            <View style={styles.sheetOverlay}>
              <TouchableOpacity style={{ flex: 1 }} onPress={() => setShowVeilSheet(false)} />
              <View style={[styles.sheetInner, { backgroundColor: p.bgSolid, borderColor: p.line }]}>
                <View style={[styles.handle, { backgroundColor: p.line }]} />
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 18, color: p.ink, fontWeight: '500', marginBottom: 4 }}>
                  {lang === 'en' ? 'Send a veiled photo' : '傳送帶紗照片'}
                </Text>
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12, color: p.muted, lineHeight: 20, marginBottom: 14 }}>
                  {lang === 'en'
                    ? 'Your photo will be hidden under a veil. The other person can lift each layer with 3 wicks. They always agree first.'
                    : '照片會藏在紗罩下。對方每揭一層需要 3 燭芯，並且需要先同意。'}
                </Text>
                <View style={{ alignItems: 'center', marginBottom: 16 }}>
                  {selectedPhotoUri ? (
                    <View style={{ width: 160, height: 160, borderRadius: 12, overflow: 'hidden', backgroundColor: p.surface }}>
                      <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: p.muted, textAlign: 'center', marginTop: 70 }}>
                        {lang === 'en' ? 'Photo selected' : '已選擇照片'}
                      </Text>
                    </View>
                  ) : (
                    <>
                      <PhotoVeil p={p} liftLevel={0} size={160} lang={lang} />
                      <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: p.muted, marginTop: 8 }}>
                        {lang === 'en' ? 'preview — 4 layers of veil' : '預覽 — 四層紗罩'}
                      </Text>
                    </>
                  )}
                </View>

                {/* Pick Photo Button */}
                {!selectedPhotoUri && !veilSent && (
                  <TouchableOpacity
                    onPress={async () => {
                      const uri = await pickImage();
                      if (uri) setSelectedPhotoUri(uri);
                    }}
                    style={[styles.sendVeilBtn, { backgroundColor: p.accentSoft, borderColor: p.accent + '40', marginBottom: 8 }]}>
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: p.accent }}>
                      {lang === 'en' ? 'Choose a photo' : '挑一張照片'}
                    </Text>
                  </TouchableOpacity>
                )}

                {!veilSent ? (
                  <TouchableOpacity
                    onPress={async () => {
                      if (!selectedPhotoUri || !conversationId || wicks < 3) return;
                      const result = await spendWicks(3, 'photo_veil', conversationId);
                      if (result.ok) {
                        const photo = await uploadVeiledPhoto({ conversationId, uri: selectedPhotoUri });
                        if (photo) {
                          await sendConversationMessage({
                            conversationId,
                            content: photo.id,
                            messageType: 'photo',
                          });
                          hapticMedium();
                          setVeilSent(true);
                          analytics.loftVeilLift(0);
                        }
                      }
                    }}
                    disabled={!selectedPhotoUri || wicks < 3}
                    style={[styles.sendVeilBtn, { backgroundColor: (selectedPhotoUri && wicks >= 3) ? p.ink : p.line }]}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                      <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: (selectedPhotoUri && wicks >= 3) ? (p.dark ? '#1a1530' : '#fff') : p.muted, fontWeight: '500' }}>
                        {lang === 'en' ? 'Send veiled photo' : '送出帶紗照片'}
                      </Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                        <WickGlyph size={11} color={(selectedPhotoUri && wicks >= 3) ? (p.dark ? '#1a1530' : '#fff') : p.muted} />
                        <Text style={{ fontFamily: 'Inter-Regular', fontSize: 12, color: (selectedPhotoUri && wicks >= 3) ? (p.dark ? '#1a1530' : 'rgba(255,255,255,0.7)') : p.muted }}>3</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ) : (
                  <View style={[styles.sentNote, { backgroundColor: p.accentSoft, borderColor: p.accent + '40' }]}>
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, color: p.accent }}>
                      {lang === 'en' ? '✓ Veiled photo sent' : '✓ 帶紗照片已送出'}
                    </Text>
                  </View>
                )}
                <TouchableOpacity onPress={() => { setShowVeilSheet(false); setVeilSent(false); setSelectedPhotoUri(null); }} style={{ alignItems: 'center', paddingVertical: 10 }}>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: p.muted }}>
                    {lang === 'en' ? 'close' : '關閉'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </SafeAreaView>
    </VaporBackground>
  );
}

function ChatBubble({ p, m, lang, onReport, wicks, conversationId, canRevealVeil }: any) {
  const isMe = m.from === 'me';
  const isPhoto = m.messageType === 'photo';
  const [revealedUrl, setRevealedUrl] = React.useState<string | null>(null);
  const [revealing, setRevealing] = React.useState(false);

  const revealPhoto = async () => {
    if (revealing || revealedUrl || !m.photoId) return;
    // Must build some conversation first — no grabbing the photo and bailing.
    if (!canRevealVeil) {
      Alert.alert(
        lang === 'en' ? 'Keep talking first' : '再多聊一點',
        lang === 'en'
          ? `Exchange at least ${VEIL_MIN_MESSAGES} messages before lifting the veil.`
          : `聊滿 ${VEIL_MIN_MESSAGES} 則訊息後，才能掀開面紗。`,
      );
      return;
    }
    if (wicks < 3) {
      Alert.alert(
        lang === 'en' ? 'Not enough wicks' : '燭芯不足',
        lang === 'en' ? 'You need 3 wicks to lift the veil.' : '需要 3 芯才能揭開紗罩。',
      );
      return;
    }
    setRevealing(true);
    const result = await spendWicks(3, 'veil_reveal', conversationId);
    if (result.ok) {
      const photo = await getVeiledPhoto(m.photoId);
      if (photo?.url) setRevealedUrl(photo.url);
    }
    setRevealing(false);
  };

  const bubble = isPhoto ? (
    <TouchableOpacity
      onPress={!isMe ? revealPhoto : undefined}
      activeOpacity={isMe ? 1 : 0.85}
      disabled={isMe || !!revealedUrl}
    >
      <View style={[
        styles.bubble,
        { padding: 6, overflow: 'hidden', alignItems: 'center' },
        isMe
          ? { backgroundColor: p.accent, borderWidth: 0 }
          : { backgroundColor: p.surface, borderWidth: 0.5, borderColor: p.line },
      ]}>
        {revealedUrl ? (
          <Image source={{ uri: revealedUrl }} style={{ width: 160, height: 160, borderRadius: 14 }} resizeMode="cover" />
        ) : (
          <>
            <PhotoVeil p={p} liftLevel={0} size={120} lang={lang} />
            {!isMe && (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                <WickGlyph size={10} color={wicks >= 3 ? p.accent : p.muted} />
                <Text style={{ fontFamily: 'Inter-Regular', fontSize: 10, color: wicks >= 3 ? p.accent : p.muted }}>
                  {revealing ? '…' : '3'}
                </Text>
              </View>
            )}
          </>
        )}
        <Text style={{
          fontFamily: 'EBGaramond-Italic', fontSize: 10,
          color: isMe ? 'rgba(255,255,255,0.7)' : p.muted,
          textAlign: 'center', marginTop: 4,
        }}>
          {revealedUrl
            ? (lang === 'en' ? 'revealed' : '已揭開')
            : isMe
            ? (lang === 'en' ? 'veiled photo sent' : '帶紗照片已送出')
            : (lang === 'en' ? 'tap to reveal · 3 wicks' : '點擊揭開 · 3 芯')}
        </Text>
      </View>
    </TouchableOpacity>
  ) : (
    <View style={[
      styles.bubble,
      isMe
        ? { backgroundColor: p.accent, borderWidth: 0, borderBottomRightRadius: 7 }
        : { backgroundColor: p.surface, borderWidth: 0.5, borderColor: p.line, borderBottomLeftRadius: 7 },
      { shadowColor: '#000', shadowOpacity: p.dark ? 0.18 : 0.05, shadowRadius: 8, shadowOffset: { width: 0, height: 3 } },
    ]}>
      <Text style={[
        styles.bubbleText,
        { color: isMe ? (p.dark ? '#15172e' : '#fbf5e4') : p.ink },
      ]}>
        {lang === 'en' ? m.en : m.zh}
      </Text>
    </View>
  );
  return (
    <View style={[styles.bubbleRow, { justifyContent: isMe ? 'flex-end' : 'flex-start' }]}>
      {!isMe && onReport ? (
        <TouchableOpacity onLongPress={onReport} delayLongPress={500} activeOpacity={1}>
          {bubble}
        </TouchableOpacity>
      ) : bubble}
    </View>
  );
}

const styles = StyleSheet.create({
  header:         { paddingTop: 8, paddingBottom: 14, paddingHorizontal: 18 },
  headerRow:      { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  backBtn:        { padding: 6 },
  otherIdentity:  { alignItems: 'center', gap: 4 },
  safetyBtn:      { padding: 6 },
  countdown:      { marginTop: 14, gap: 8, paddingHorizontal: 6 },
  countdownRow:   { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8 },
  timer:          { fontFamily: 'Inter-Regular', fontSize: 22, fontWeight: '300', letterSpacing: 1 },
  dissolveNote:   { fontFamily: 'EBGaramond-Italic', fontSize: 11, textAlign: 'center', opacity: 0.7 },
  messages:       { flex: 1 },
  openNote:       { fontFamily: 'EBGaramond-Italic', fontSize: 11, textAlign: 'center', opacity: 0.7, marginBottom: 6 },
  emptyState:     { alignItems: 'center', paddingTop: 64, paddingHorizontal: 20 },
  emptyTitle:     { fontFamily: 'NotoSerifTC-Light', fontSize: 21, letterSpacing: 1, textAlign: 'center' },
  emptyBody:      { fontFamily: 'NotoSerifTC-Regular', fontSize: 13.5, lineHeight: 23, textAlign: 'center', marginTop: 10, maxWidth: 260 },
  bubbleRow:      { flexDirection: 'row' },
  bubble:         { maxWidth: '78%', paddingVertical: 10, paddingHorizontal: 15, borderRadius: 22 },
  bubbleText:     { fontFamily: 'NotoSerifTC-Regular', fontSize: 15, lineHeight: 24 },
  typingRow:      { flexDirection: 'row', alignItems: 'flex-end', gap: 6, opacity: 0.7, marginTop: 4 },
  typingBubble:   { borderRadius: 16, borderWidth: 0.5, overflow: 'hidden' },
  composer:       { padding: 4, paddingHorizontal: 18, paddingBottom: 18, gap: 8 },
  input:          { flex: 1, fontFamily: 'NotoSerifTC-Regular', fontSize: 15, paddingHorizontal: 14, paddingVertical: 12 },
  sendBtn:        { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  veilBar:        { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 14, borderWidth: 0.5 },
  watermarkLayer: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, opacity: 0.04, zIndex: 1, justifyContent: 'space-around', overflow: 'hidden' },
  watermarkRow:   { flexDirection: 'row', justifyContent: 'space-around' },
  watermarkText:  { fontFamily: 'Inter-Regular', fontSize: 11, letterSpacing: 2, transform: [{ rotate: '-30deg' }] },
  sheetOverlay:   { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  sheetInner:     { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 34, borderTopWidth: 0.5, gap: 6 },
  handle:         { width: 36, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: 8 },
  sendVeilBtn:    { height: 54, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginTop: 8 },
  sentNote:       { height: 54, borderRadius: 999, alignItems: 'center', justifyContent: 'center', marginTop: 8, borderWidth: 0.5 },
});
