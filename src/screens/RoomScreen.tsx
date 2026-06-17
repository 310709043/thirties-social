import React, { useState, useEffect } from 'react';
import {
  View, Text, TouchableOpacity, ScrollView, Alert,
  TextInput, StyleSheet, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { DIRECTIONS } from '../lib/theme';
import { t, tAlt } from '../lib/copy';
import { VaporBackground, GlassCard, Hairline, WickGlyph, FadeInUp, MessageSkeleton } from '../components/ui';
import { Identity } from '../components/identity/Identity';
import { ColorAdjLabel } from '../components/identity/Identity';
import { useAppStore, canCreateRoom } from '../hooks/useAppStore';
import { getOrCreatePresetRoom, subscribeToRoomMessages, sendRoomMessage, createRoom, createConversation, DbRoom, DbRoomMessage, fetchOlderRoomMessages, ROOM_CAPACITY, getCurrentUid, RoomPresence, countActivePresence, fetchActivePresenceCount, joinRoomPresence, heartbeatRoomPresence, leaveRoomPresence, subscribeToRoomPresence } from '../lib/db';
import { t as getT } from '../lib/copy';
import { hapticLight } from '../lib/haptics';
import { filterMessage } from '../lib/filter';

type Props = NativeStackScreenProps<RootStackParamList, 'Room'>;


export default function RoomScreen({ navigation, route }: Props) {
  const { roomKey } = route.params;
  const { seed, direction, lang, identityKind, deviceId } = useAppStore();
  const p = DIRECTIONS[direction];
  const [inviting, setInviting] = useState<{senderId: string; seed: string; zh: string; en: string; age: number} | null>(null);
  const [inviteSent, setInviteSent] = useState(false);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [roomTopic, setRoomTopic] = useState('');
  const [roomCreated, setRoomCreated] = useState(false);
  const [identitySeed, setIdentitySeed] = useState(seed);
  const [roomId, setRoomId] = useState<string | null>(null);
  const [room, setRoom] = useState<DbRoom | null>(null);
  const [messages, setMessages] = useState<DbRoomMessage[]>([]);
  const [sending, setSending] = useState(false);
  const [inputText, setInputText] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [presence, setPresence] = useState<RoomPresence[]>([]);
  const [readOnly, setReadOnly] = useState(false);

  const uid = getCurrentUid();
  // Live "who's here" comes from fresh presence heartbeats, not cumulative
  // membership — so the count shrinks when people leave or go stale.
  const activeMembers = presence.filter(
    e => !e.lastSeen || Date.now() - e.lastSeen.toMillis() < 45000,
  );
  const liveCount = activeMembers.length;
  const isRoomFull = liveCount >= ROOM_CAPACITY;
  // readOnly is set only when we entered an already-full room (never joined).
  const canSend = !readOnly && !!uid;

  const reshuffleIdentity = () => {
    setIdentitySeed(Math.random().toString(36).slice(2));
  };

  const onRefresh = async () => {
    setRefreshing(true);
    const r = await getOrCreatePresetRoom({
      roomKey,
      topicZh: getT(roomKey as any, 'zh'),
      topicEn: getT(roomKey as any, 'en'),
    });
    if (r) { setRoomId(r.id); setRoom(r); }
    setRefreshing(false);
  };

  const loadOlder = async () => {
    if (!roomId || loadingOlder || !hasMore || messages.length === 0) return;
    setLoadingOlder(true);
    const oldest = messages[0];
    const older = await fetchOlderRoomMessages(roomId, oldest.createdAt);
    if (older.length === 0) {
      setHasMore(false);
    } else {
      setMessages(prev => [...older, ...prev]);
    }
    setLoadingOlder(false);
  };

  // Guests can join rooms but not open them.
  const openCreateRoom = () => {
    if (!canCreateRoom()) {
      Alert.alert(
        lang === 'en' ? 'Create an account to open a room' : '開房間需要先建立帳號',
        lang === 'en'
          ? 'Guests can join rooms. Create an account to open your own.'
          : '訪客可以參與房間。建立帳號後即可開設自己的房間。',
        [
          { text: lang === 'en' ? 'Not now' : '稍後', style: 'cancel' },
          { text: lang === 'en' ? 'Create account' : '建立帳號', onPress: () => navigation.push('Auth', { mode: 'register' }) },
        ],
      );
      return;
    }
    setShowCreateRoom(true);
  };

  useEffect(() => {
    if (roomKey === 'new') {
      openCreateRoom();
      return;
    }
    getOrCreatePresetRoom({
      roomKey,
      topicZh: getT(roomKey as any, 'zh'),
      topicEn: getT(roomKey as any, 'en'),
    }).then(r => {
      if (r) { setRoomId(r.id); setRoom(r); }
    });
  }, [roomKey]);

  useEffect(() => {
    if (!roomId) return;
    return subscribeToRoomMessages(roomId, setMessages);
  }, [roomId]);

  // Join presence on entry (unless the room is already full), heartbeat while
  // here, and clear our slot on leave.
  useEffect(() => {
    if (!roomId || !uid) return;
    let active = true;
    let hbId: ReturnType<typeof setInterval> | undefined;
    setReadOnly(false);
    (async () => {
      const others = await fetchActivePresenceCount(roomId);
      if (!active) return;
      if (others >= ROOM_CAPACITY) { setReadOnly(true); return; }
      await joinRoomPresence(roomId, identitySeed);
      if (!active) { leaveRoomPresence(roomId); return; }
      hbId = setInterval(() => heartbeatRoomPresence(roomId), 20000);
    })();
    const unsub = subscribeToRoomPresence(roomId, setPresence);
    return () => {
      active = false;
      if (hbId) clearInterval(hbId);
      leaveRoomPresence(roomId);
      unsub();
    };
  }, [roomId, uid]);

  // Recompute the live count as heartbeats age out even without new snapshots.
  useEffect(() => {
    if (!roomId) return;
    const id = setInterval(() => setPresence(p => [...p]), 15000);
    return () => clearInterval(id);
  }, [roomId]);

  // When invite sent, create a real conversation → go to Chat
  useEffect(() => {
    if (inviteSent) {
      const id = setTimeout(async () => {
        const conv = await createConversation({ userBId: inviting!.senderId, roomId: roomId ?? undefined });
        navigation.push('Chat', { otherSeed: inviting!.seed, conversationId: conv?.id });
      }, 2400);
      return () => clearTimeout(id);
    }
  }, [inviteSent]);

  const handleSend = async () => {
    if (!inputText.trim()) return;
    console.log('[RoomScreen] handleSend called, roomId:', roomId, 'uid:', uid);
    if (!roomId) {
      Alert.alert(
        lang === 'en' ? 'Still loading' : '載入中',
        lang === 'en' ? 'Room is still loading, please wait.' : '房間仍在載入中，請稍候。',
      );
      return;
    }
    if (!uid) {
      Alert.alert(
        lang === 'en' ? 'Not signed in' : '未登入',
        lang === 'en' ? 'Please sign in to send messages.' : '請先登入才能發送訊息。',
      );
      return;
    }
    const check = filterMessage(inputText.trim());
    if (check.blocked) {
      Alert.alert(
        lang === 'en' ? 'Message blocked' : '訊息已被過濾',
        lang === 'en' ? 'This message contains content that may be harmful.' : '這則訊息包含可能傷害他人的內容。',
      );
      return;
    }
    setSending(true);
    const result = await sendRoomMessage({ roomId, content: inputText.trim(), senderSeed: identitySeed });
    setSending(false);
    if (result === true) {
      setInputText('');
      hapticLight();
    } else {
      Alert.alert(
        lang === 'en' ? 'Failed to send' : '\u9001\u51FA\u5931\u6557',
        lang === 'en' ? 'Please try again.' : '\u8ACB\u7A0D\u5F8C\u518D\u8A66\u4E00\u6B21\u3002',
      );
    }
  };

  return (
    <VaporBackground p={p} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* TOP BAR */}
        <View style={styles.topBar}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={[styles.iconBtn, { backgroundColor: p.surface, borderColor: p.line }]}
          >
            <Text style={{ color: p.muted, fontSize: 18 }}>‹</Text>
          </TouchableOpacity>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity
              onPress={openCreateRoom}
              style={[styles.labelBtn, { backgroundColor: p.accentSoft, borderColor: p.accent + '40' }]}
            >
              <Text style={[styles.labelBtnText, { color: p.accent }]}>
                {lang === 'en' ? '+ open room' : '+ 開設房間'}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => navigation.push('Safety', {})}
              style={[styles.labelBtn, { backgroundColor: p.surface, borderColor: p.line }]}
            >
              <Text style={[styles.labelBtnText, { color: p.muted }]}>
                {lang === 'en' ? 'safety' : '安全'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ROOM HEADER */}
        <View style={styles.header}>
          <Text style={[styles.roomNum, { color: p.muted }]}>
            {lang === 'en' ? 'Room' : '房間'}
          </Text>
          <Text style={[styles.roomName, { color: p.ink }]}>
            {room?.customTopicZh || room?.customTopicEn || t(roomKey as any, lang)}
          </Text>
          {room?.customTopicZh || room?.customTopicEn ? null : (
            <Text style={[styles.roomNameAlt, { color: p.muted }]}>{tAlt(roomKey as any, lang)}</Text>
          )}

          {/* Live count */}
          <View style={styles.liveRow}>
            {activeMembers.length > 0 && (
              <View style={styles.avatarStack}>
                {activeMembers.slice(0, 4).map((m, i) => (
                  <View key={m.userId} style={[styles.avatarWrap, { marginLeft: i === 0 ? 0 : -10, borderColor: p.surfaceSolid, backgroundColor: p.surfaceSolid }]}>
                    <Identity kind="sigil" seed={m.seed} size={18} palette={p} />
                  </View>
                ))}
              </View>
            )}
            <Text style={[styles.liveText, { color: p.muted }]}>
              {liveCount === 0
                ? (lang === 'en' ? 'no one here yet' : '還沒有人')
                : `${liveCount}/${ROOM_CAPACITY} ${t('roomPeople', lang)}`}
            </Text>
            <Text style={[styles.liveDot, { color: p.muted }]}>·</Text>
            <Text style={[styles.liveText, { color: p.muted }]}>{t('roomEphemeral', lang)}</Text>
          </View>
        </View>

        {/* MESSAGE FEED */}
        <ScrollView
          style={styles.feed}
          contentContainerStyle={{ gap: 12, padding: 24 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={p.muted} />
          }
          onScroll={(e) => {
            if (e.nativeEvent.contentOffset.y <= 0) loadOlder();
          }}
          scrollEventThrottle={400}
        >
          {roomId === null ? (
            <>
              <MessageSkeleton color={p.muted + '60'} />
              <MessageSkeleton color={p.muted + '60'} />
              <MessageSkeleton color={p.muted + '60'} />
            </>
          ) : messages.length === 0 ? (
            <Text style={[styles.dissolved, { color: p.muted, marginTop: 20 }]}>
              {lang === 'en' ? 'be the first to whisper here.' : '成為第一個在這裡說話的人。'}
            </Text>
          ) : (
            <>
              {loadingOlder && (
                <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                  <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 12, color: p.muted }}>
                    {lang === 'en' ? 'loading older messages…' : '載入更早的訊息⋯'}
                  </Text>
                </View>
              )}
              {messages.map((msg, i) => (
                <FadeInUp key={msg.id} distance={10} delay={Math.min(i * 30, 180)}>
                  <TouchableOpacity onPress={() => setInviting({ senderId: msg.senderId, seed: msg.senderSeed, zh: msg.content, en: msg.content, age: 0 })} activeOpacity={0.8}>
                    <View style={{ flexDirection: 'row', gap: 12 }}>
                      <Identity kind={identityKind === 'character' ? 'sigil' : identityKind} seed={msg.senderSeed} size={32} palette={p} lang={lang} trust={0.15} />
                      <View style={{ flex: 1 }}>
                        <View style={[styles.bubble, { backgroundColor: p.surface, borderColor: p.line }]}>
                          <Text style={[styles.bubbleText, { color: p.ink }]}>{msg.content}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4, paddingLeft: 6 }}>
                          <ColorAdjLabel seed={msg.senderSeed} lang={lang} palette={p} />
                        </View>
                      </View>
                    </View>
                  </TouchableOpacity>
                </FadeInUp>
              ))}
            </>
          )}
          {messages.length > 0 && (
            <>
              <View style={styles.divider}>
                <Hairline p={p} style={{ flex: 1 }} />
                <Text style={[styles.dividerText, { color: p.muted }]}>{lang === 'en' ? 'earlier' : '更早'}</Text>
                <Hairline p={p} style={{ flex: 1 }} />
              </View>
              <Text style={[styles.dissolved, { color: p.muted }]}>
                {lang === 'en' ? 'older fragments dissolve into the room.' : '更早的片段已融入房間之中。'}
              </Text>
            </>
          )}
        </ScrollView>

        {/* COMPOSER */}
        <View style={[styles.composer, { backgroundColor: p.dark ? 'rgba(13,18,36,0.9)' : 'rgba(255,255,255,0.7)' }]}>
          {canSend ? (
            <>
              {/* Who you are in this room */}
              <View style={[styles.identityComposerRow, { backgroundColor: p.surface, borderColor: p.line }]}>
                <Identity kind={identityKind} seed={identitySeed} size={28} palette={p} lang={lang} trust={0.2} />
                <View style={{ flex: 1 }}>
                  <ColorAdjLabel seed={identitySeed} lang={lang} palette={p} />
                  <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 10, color: p.muted, marginTop: 1 }}>
                    {lang === 'en' ? 'who you are in this room' : '你在這個房間的身份'}
                  </Text>
                </View>
                <TouchableOpacity onPress={reshuffleIdentity}
                  style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, backgroundColor: p.accentSoft }}>
                  <Text style={{ fontFamily: 'Inter-Regular', fontSize: 10, color: p.accent, letterSpacing: 0.5 }}>
                    {lang === 'en' ? '↺ reshuffle' : '↺ 換一個'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={[styles.composerHint, { color: p.muted }]}>
                {lang === 'en' ? 'tap any message to invite that person to talk' : '輕點任一則訊息，邀請那個人私聊'}
              </Text>
              <View style={[styles.inputRow, { backgroundColor: p.surface, borderColor: p.line }]}>
                <TextInput
                  value={inputText}
                  onChangeText={setInputText}
                  placeholder={lang === 'en' ? 'whisper into the room…' : '對房間說一句⋯⋯'}
                  placeholderTextColor={p.muted}
                  style={[styles.input, { color: p.ink }]}
                  editable={!sending}
                />
                <TouchableOpacity
                  style={[styles.sendBtn, { backgroundColor: inputText.trim() ? p.ink : p.line }]}
                  onPress={handleSend}
                  disabled={!inputText.trim() || sending}
                >
                  <Text style={{ color: inputText.trim() ? (p.dark ? '#1a1530' : '#fff') : p.muted, fontSize: 16 }}>↑</Text>
                </TouchableOpacity>
              </View>
            </>
          ) : (
            <View style={[styles.identityComposerRow, { backgroundColor: p.surface, borderColor: p.line }]}>
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: p.muted, textAlign: 'center', flex: 1 }}>
                {lang === 'en'
                  ? `Room full (${ROOM_CAPACITY}/${ROOM_CAPACITY}) — you can read but not send`
                  : `房間已滿（${ROOM_CAPACITY}/${ROOM_CAPACITY}）— 可以閱讀但無法發言`}
              </Text>
            </View>
          )}
        </View>

        {/* CREATE ROOM SHEET */}
        {showCreateRoom && (
          <View style={[styles.sheetOverlay, { backgroundColor: p.dark ? 'rgba(10,12,28,0.7)' : 'rgba(160,150,170,0.4)' }]}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => { if (!roomCreated) setShowCreateRoom(false); }} />
            <View style={[styles.sheet, { backgroundColor: p.bgSolid, borderColor: p.line }]}>
              <View style={[styles.sheetHandle, { backgroundColor: p.line }]} />
              {!roomCreated ? (
                <>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 18, color: p.ink, fontWeight: '500' }}>
                    {lang === 'en' ? 'Open a room' : '開設一個房間'}
                  </Text>
                  <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 12, color: p.muted }}>
                    {lang === 'en' ? 'others see your topic · not your identity' : '別人看到話題，看不到你是誰'}
                  </Text>
                  <GlassCard p={p} padding={6} radius={18} style={{ marginTop: 4 }}>
                    <TextInput
                      value={roomTopic}
                      onChangeText={setRoomTopic}
                      placeholder={lang === 'en' ? 'What is this room about? (e.g. "can\'t sleep again")' : '這個房間在說什麼？（例如：又睡不著了）'}
                      placeholderTextColor={p.muted}
                      multiline
                      numberOfLines={2}
                      style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: p.ink, paddingHorizontal: 14, paddingVertical: 12, lineHeight: 24 }}
                    />
                  </GlassCard>
                  <TouchableOpacity
                    onPress={async () => {
                      if (roomTopic.trim().length > 0) {
                        const newRoom = await createRoom({ topicZh: roomTopic.trim() });
                        if (newRoom) {
                          setRoomId(newRoom.id);
                          setRoom(newRoom);
                        }
                        setRoomCreated(true);
                      }
                    }}
                    style={[styles.inviteBtn, { backgroundColor: roomTopic.trim().length > 0 ? p.ink : p.line }]}
                  >
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: roomTopic.trim().length > 0 ? (p.dark ? '#1a1530' : '#fff') : p.muted, fontWeight: '500' }}>
                      {lang === 'en' ? 'Open the room' : '開啟房間'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setShowCreateRoom(false)} style={styles.cancelBtn}>
                    <Text style={[styles.cancelText, { color: p.muted }]}>{lang === 'en' ? 'cancel' : '取消'}</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 12, gap: 10 }}>
                  <Text style={[styles.waitingText, { color: p.ink }]}>
                    {lang === 'en' ? 'Room is open ·' : '房間已開啟 ·'} 🕯
                  </Text>
                  <Text style={[styles.waitingHint, { color: p.muted }]}>
                    {lang === 'en' ? 'Others can find your room and whisper in.' : '其他人可以找到你的房間並留言。'}
                  </Text>
                  <TouchableOpacity onPress={() => { setShowCreateRoom(false); setRoomCreated(false); setRoomTopic(''); }}
                    style={[styles.inviteBtn, { backgroundColor: p.ink, width: '100%' }]}>
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: p.dark ? '#1a1530' : '#fff', fontWeight: '500' }}>
                      {lang === 'en' ? 'done' : '完成'}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        )}

        {/* INVITE SHEET */}
        {inviting && (
          <View style={[styles.sheetOverlay, { backgroundColor: p.dark ? 'rgba(10,12,28,0.7)' : 'rgba(160,150,170,0.4)' }]}>
            <TouchableOpacity style={{ flex: 1 }} onPress={() => !inviteSent && setInviting(null)} />
            <View style={[styles.sheet, { backgroundColor: p.bgSolid, borderColor: p.line }]}>
              <View style={[styles.sheetHandle, { backgroundColor: p.line }]} />
              {!inviteSent ? (
                <>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
                    <Identity kind={identityKind === 'character' ? 'sigil' : identityKind}
                      seed={inviting.seed} size={44} palette={p} lang={lang} trust={0.15} />
                    <View>
                      <ColorAdjLabel seed={inviting.seed} lang={lang} palette={p} />
                      <Text style={[styles.anonLabel, { color: p.muted }]}>
                        {lang === 'en' ? 'anonymous' : '匿名'}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.quoteBox, { backgroundColor: p.surface, borderColor: p.line }]}>
                    <Text style={[styles.quoteText, { color: p.inkSoft }]}>
                      「{lang === 'en' ? inviting.en : inviting.zh}」
                    </Text>
                  </View>
                  <Text style={[styles.inviteHint, { color: p.muted }]}>
                    {lang === 'en'
                      ? 'They will see your sigil and tonight\'s line — nothing else. 30-minute window if they accept.'
                      : '對方只會看到你的識別與今晚寫的那句話。同意後開啟 30 分鐘窗口。'}
                  </Text>
                  <TouchableOpacity
                    onPress={() => setInviteSent(true)}
                    style={[styles.inviteBtn, { backgroundColor: p.ink }]}
                  >
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: p.dark ? '#1a1530' : '#fff', fontWeight: '500' }}>
                      {lang === 'en' ? 'Send the invitation' : '送出邀請'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => setInviting(null)} style={styles.cancelBtn}>
                    <Text style={[styles.cancelText, { color: p.muted }]}>
                      {lang === 'en' ? 'not now' : '不了'}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={{ alignItems: 'center', paddingVertical: 12 }}>
                  <Text style={[styles.waitingText, { color: p.ink }]}>
                    {lang === 'en' ? 'Invitation sent · waiting…' : '邀請已送出 · 等待對方⋯⋯'}
                  </Text>
                  <Text style={[styles.waitingHint, { color: p.muted }]}>
                    {lang === 'en' ? "we'll open the window if they say yes" : '對方同意時窗口會自動開啟'}
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
      </SafeAreaView>
    </VaporBackground>
  );
}

const styles = StyleSheet.create({
  topBar:       { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: 18, paddingTop: 8 },
  iconBtn:      { width: 36, height: 36, borderRadius: 18, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  labelBtn:     { height: 36, paddingHorizontal: 14, borderRadius: 18, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  labelBtnText: { fontFamily: 'NotoSerifTC-Regular', fontSize: 12 },
  header:       { paddingHorizontal: 24, paddingBottom: 12 },
  roomNum:      { fontFamily: 'Inter-Regular', fontSize: 10, letterSpacing: 2, textTransform: 'uppercase', fontWeight: '500' },
  roomName:     { fontFamily: 'NotoSerifTC-Regular', fontSize: 28, lineHeight: 38, marginTop: 6 },
  roomNameAlt:  { fontFamily: 'EBGaramond-Italic', fontSize: 14, opacity: 0.7, marginTop: 2 },
  liveRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 14 },
  avatarStack:  { flexDirection: 'row' },
  avatarWrap:   { width: 22, height: 22, borderRadius: 11, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  avatarCount:  {},
  liveText:     { fontFamily: 'Inter-Regular', fontSize: 11 },
  liveDot:      { fontFamily: 'Inter-Regular', fontSize: 11, opacity: 0.4 },
  feed:         { flex: 1 },
  bubble:       { borderRadius: 22, borderWidth: 0.5, padding: 14 },
  bubbleText:   { fontFamily: 'NotoSerifTC-Regular', fontSize: 15, lineHeight: 24 },
  divider:      { flexDirection: 'row', alignItems: 'center', gap: 10, opacity: 0.5, marginVertical: 6 },
  dividerText:  { fontFamily: 'EBGaramond-Italic', fontSize: 11 },
  dissolved:    { fontFamily: 'NotoSerifTC-Regular', fontSize: 14, textAlign: 'center', opacity: 0.55, lineHeight: 22 },
  composer:              { padding: 12, paddingBottom: 18, gap: 8 },
  composerHint:          { fontFamily: 'NotoSerifTC-Regular', fontSize: 12, textAlign: 'center' },
  identityComposerRow:   { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 10, borderRadius: 14, borderWidth: 0.5 },
  inputRow:              { flexDirection: 'row', alignItems: 'center', borderRadius: 28, borderWidth: 0.5, paddingLeft: 4, paddingRight: 4, paddingVertical: 4 },
  input:        { flex: 1, fontFamily: 'NotoSerifTC-Regular', fontSize: 15, paddingHorizontal: 14, paddingVertical: 10 },
  sendBtn:      { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
  // Invite sheet
  sheetOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, justifyContent: 'flex-end' },
  sheet:        { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: 24, paddingBottom: 34, borderTopWidth: 0.5, gap: 14 },
  sheetHandle:  { width: 36, height: 4, borderRadius: 4, alignSelf: 'center', marginBottom: 4 },
  quoteBox:     { borderRadius: 14, borderWidth: 0.5, padding: 14 },
  quoteText:    { fontFamily: 'NotoSerifTC-Regular', fontSize: 14, lineHeight: 22 },
  inviteHint:   { fontFamily: 'NotoSerifTC-Regular', fontSize: 12, lineHeight: 20 },
  inviteBtn:    { height: 54, borderRadius: 999, alignItems: 'center', justifyContent: 'center' },
  cancelBtn:    { alignItems: 'center', paddingVertical: 12 },
  cancelText:   { fontFamily: 'NotoSerifTC-Regular', fontSize: 13 },
  anonLabel:    { fontFamily: 'EBGaramond-Italic', fontSize: 11, marginTop: 2 },
  waitingText:  { fontFamily: 'NotoSerifTC-Regular', fontSize: 16, marginBottom: 8 },
  waitingHint:  { fontFamily: 'EBGaramond-Italic', fontSize: 12 },
});
