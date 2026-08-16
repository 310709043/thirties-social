// InviteScreen (A4, W2-6) — a woman decides on a firepit invite. Give full
// context, make declining zero-cost, and never charge her: the inviter pays
// only when HE first speaks in the accepted conversation.
import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { DIRECTIONS } from '../lib/theme';
import { VaporBackground, ScreenHeader, SoftButton } from '../components/ui';
import { Identity, ColorAdjLabel } from '../components/identity/Identity';
import { useAppStore } from '../hooks/useAppStore';
import { acceptInvite, declineInvite } from '../lib/db';
import { hapticSuccess } from '../lib/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'Invite'>;

export default function InviteScreen({ navigation, route }: Props) {
  const { inviteId, fromSeed, quote, quoteContext, note, fromGender, fromAge } = route.params;
  const { direction, lang, identityKind } = useAppStore();
  const p = DIRECTIONS[direction];
  const [busy, setBusy] = useState(false);

  const onAccept = async () => {
    if (busy) return;
    setBusy(true);
    const r = await acceptInvite(inviteId);
    if (r.ok && r.conversationId) {
      hapticSuccess();
      navigation.replace('Chat', { otherSeed: fromSeed, conversationId: r.conversationId, matchCharge: false });
    } else {
      setBusy(false);
      Alert.alert(
        lang === 'en' ? 'Could not open' : '沒能開始',
        lang === 'en' ? 'This invite may have expired. Try another.' : '這個邀請可能已經過期了，看看下一個。',
      );
    }
  };

  const onDecline = async () => {
    if (busy) return;
    setBusy(true);
    await declineInvite(inviteId);
    navigation.goBack();
  };

  const stat = (num: string, label: string) => (
    <View style={{ flex: 1, padding: 11, borderRadius: 14, borderWidth: 0.5, borderColor: p.line, alignItems: 'center' }}>
      <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 17, color: p.ink }}>{num}</Text>
      <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 10.5, color: p.muted, marginTop: 3, textAlign: 'center' }}>{label}</Text>
    </View>
  );

  return (
    <VaporBackground p={p} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1, width: '100%', maxWidth: 560, alignSelf: 'center' }}>
        <ScrollView contentContainerStyle={{ padding: 22, gap: 16 }} showsVerticalScrollIndicator={false}>
          <ScreenHeader p={p} onBack={() => navigation.goBack()} />

          <View style={{ gap: 6 }}>
            <Text style={{ fontFamily: 'Inter-Regular', fontSize: 9.5, letterSpacing: 1.7, textTransform: 'uppercase', color: p.accent, fontWeight: '600' }}>
              {lang === 'en' ? 'someone wants to talk to you alone' : '有人想單獨跟你說話'}
            </Text>
            <Text style={{ fontFamily: 'NotoSerifTC-Light', fontSize: 26, lineHeight: 36, color: p.ink }}>
              {lang === 'en' ? 'The line he heard was yours' : '他聽到的是你這句'}
            </Text>
          </View>

          {/* Main card */}
          <View style={{ padding: 20, borderRadius: 24, borderWidth: 1, borderColor: p.line, backgroundColor: p.surface, gap: 14 }}>
            <View style={{ padding: 14, borderRadius: 16, backgroundColor: p.accentSoft, borderLeftWidth: 2, borderLeftColor: p.accent }}>
              <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, lineHeight: 25, color: p.ink }}>「{quote}」</Text>
              {quoteContext ? (
                <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: p.muted, marginTop: 6 }}>
                  {lang === 'en' ? `you said this in ${quoteContext}` : `你在「${quoteContext}」說的`}
                </Text>
              ) : null}
            </View>

            <View style={{ height: 0.5, backgroundColor: p.line }} />

            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
              <Identity kind={identityKind === 'character' ? 'sigil' : identityKind} seed={fromSeed} size={46} palette={p} lang={lang} trust={0.15} />
              <View style={{ flex: 1 }}>
                <ColorAdjLabel seed={fromSeed} lang={lang} palette={p} />
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 4 }}>
                  {(fromGender || fromAge) ? (
                    <View style={{ paddingHorizontal: 9, paddingVertical: 3, borderRadius: 999, backgroundColor: p.accentSoft }}>
                      <Text style={{ fontFamily: 'Inter-Regular', fontSize: 11, color: p.accent }}>
                        {[fromGender === 'male' ? (lang === 'en' ? 'man' : '男') : fromGender === 'female' ? (lang === 'en' ? 'woman' : '女') : null, fromAge].filter(Boolean).join(' · ')}
                      </Text>
                    </View>
                  ) : null}
                </View>
              </View>
            </View>

            {note ? (
              <View style={{ padding: 13, borderRadius: 14, backgroundColor: p.glass }}>
                <Text style={{ fontFamily: 'Inter-Regular', fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase', color: p.muted, fontWeight: '600', marginBottom: 5 }}>
                  {lang === 'en' ? 'he said' : '他說'}
                </Text>
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 14, lineHeight: 23, color: p.ink }}>{note}</Text>
              </View>
            ) : null}

            <View style={{ flexDirection: 'row', gap: 8 }}>
              {stat('30', lang === 'en' ? 'minutes' : '分鐘')}
              {stat('0', lang === 'en' ? 'wicks you pay' : '你要付的燭芯')}
              {stat(lang === 'en' ? 'you' : '你', lang === 'en' ? 'decide the veil' : '決定揭紗')}
            </View>
          </View>

          {/* Protection */}
          <View style={{ padding: 14, borderRadius: 18, borderWidth: 0.6, borderColor: 'rgba(150,160,210,0.28)', backgroundColor: 'rgba(150,160,210,0.08)' }}>
            <Text style={{ fontFamily: 'Inter-Regular', fontSize: 9.5, letterSpacing: 1.5, textTransform: 'uppercase', color: '#a8b0dc', fontWeight: '600', marginBottom: 5 }}>
              {lang === 'en' ? 'you can stop anytime' : '你隨時可以停'}
            </Text>
            <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 12.5, lineHeight: 20, color: p.inkSoft }}>
              {lang === 'en'
                ? 'Want out mid-way? One tap top-right ends it — no goodbye. He never learns why, and can’t reach you again.'
                : '聊到一半想走，右上角一按就結束，不用說再見。他不會知道原因，也不會再邀請到你。'}
            </Text>
          </View>

          <SoftButton p={p} variant="primary" size="lg" full onPress={onAccept} disabled={busy}>
            {lang === 'en' ? 'Accept · start 30 minutes' : '接受 · 開始 30 分鐘'}
          </SoftButton>
          <View style={{ flexDirection: 'row', gap: 10 }}>
            <SoftButton p={p} variant="secondary" size="md" style={{ flex: 1 }} onPress={() => navigation.goBack()} disabled={busy}>
              {lang === 'en' ? 'See next' : '看下一個'}
            </SoftButton>
            <SoftButton p={p} variant="danger" size="md" style={{ flex: 1 }} onPress={onDecline} disabled={busy}>
              {lang === 'en' ? 'Not to be disturbed' : '不想被打擾'}
            </SoftButton>
          </View>
        </ScrollView>
      </SafeAreaView>
    </VaporBackground>
  );
}
