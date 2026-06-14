import React, { useEffect, useRef, useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, StyleSheet, Animated, Easing, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { DIRECTIONS } from '../lib/theme';
import { t } from '../lib/copy';
import { VaporBackground, GlassCard, SoftButton, FadeInUp } from '../components/ui';
import { useAppStore } from '../hooks/useAppStore';
import { fileReport, endConversation } from '../lib/db';

type Props = NativeStackScreenProps<RootStackParamList, 'Safety'>;

export default function SafetyScreen({ navigation, route }: Props) {
  const { direction, lang } = useAppStore();
  const p = DIRECTIONS[direction];
  const hotlinePulse = useRef(new Animated.Value(1)).current;
  const [submitting, setSubmitting] = useState(false);

  const reportedUserId = route.params?.reportedUserId;
  const conversationId = route.params?.conversationId;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(hotlinePulse, { toValue: 1.05, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
        Animated.timing(hotlinePulse, { toValue: 1, duration: 1500, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const handleBlock = async () => {
    if (submitting) return;
    setSubmitting(true);
    if (reportedUserId) {
      await fileReport({
        reportedUserId,
        reportType: 'block',
        description: 'User blocked from conversation',
        conversationId: conversationId ?? undefined,
      });
    }
    if (conversationId) await endConversation(conversationId, 'blocked');
    setSubmitting(false);
    navigation.replace('Close');
  };

  const handleReport = async () => {
    if (submitting) return;
    setSubmitting(true);
    if (reportedUserId) {
      await fileReport({
        reportedUserId,
        reportType: 'report',
        description: lang === 'en' ? 'Reported for inappropriate behavior' : 'Reported for inappropriate behavior',
        conversationId: conversationId ?? undefined,
      });
    }
    if (conversationId) await endConversation(conversationId, 'reported');
    setSubmitting(false);
    Alert.alert(
      lang === 'en' ? 'Report submitted' : '\u6AA2\u8209\u5DF2\u9001\u51FA',
      lang === 'en' ? 'Thank you. We will review this shortly.' : '\u8B1D\u8B1D\u4F60\u3002\u6211\u5011\u6703\u76E1\u5FEB\u5BE9\u67E5\u3002',
      [{ text: 'OK', onPress: () => navigation.replace('Close') }],
    );
  };

  const handleLeave = async () => {
    if (conversationId) await endConversation(conversationId, 'user_left');
    navigation.replace('Close');
  };

  return (
    <VaporBackground p={p} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
          {/* Back */}
          <FadeInUp delay={0} distance={6}>
            <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
              <Text style={[styles.backText, { color: p.muted }]}>
                {lang === 'en' ? '\u2190 back' : '\u2190 \u8FD4\u56DE'}
              </Text>
            </TouchableOpacity>
          </FadeInUp>

          {/* Title */}
          <FadeInUp delay={80} distance={12}>
            <View style={styles.header}>
              <Text style={[styles.title, { color: p.ink }]}>{t('safetyTitle', lang)}</Text>
              <Text style={[styles.blurb, { color: p.muted }]}>{t('safetyBlurb', lang)}</Text>
            </View>
          </FadeInUp>

          {/* Actions */}
          <View style={styles.actions}>
            <FadeInUp delay={180} distance={10}>
              <SoftButton p={p} variant="danger" size="lg" full
                onPress={handleBlock} disabled={submitting}>
                <View style={{ gap: 4, alignItems: 'center' }}>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: p.danger }}>
                    {t('safetyBlock', lang)}
                  </Text>
                  {reportedUserId && (
                    <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: p.danger, opacity: 0.6 }}>
                      {lang === 'en' ? 'ends conversation + blocks this person' : '\u7D50\u675F\u5C0D\u8A71\u4E26\u5C01\u9396\u6B64\u4EBA'}
                    </Text>
                  )}
                </View>
              </SoftButton>
            </FadeInUp>

            <FadeInUp delay={260} distance={10}>
              <SoftButton p={p} variant="secondary" size="lg" full
                onPress={handleReport} disabled={submitting}>
                <View style={{ gap: 4, alignItems: 'center' }}>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: p.ink }}>
                    {t('safetyReport', lang)}
                  </Text>
                  {reportedUserId && (
                    <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 11, color: p.muted }}>
                      {lang === 'en' ? 'our team will review within 24 hours' : '\u6211\u5011\u7684\u5718\u968A\u6703\u5728 24 \u5C0F\u6642\u5167\u5BE9\u67E5'}
                    </Text>
                  )}
                </View>
              </SoftButton>
            </FadeInUp>

            <FadeInUp delay={340} distance={10}>
              <SoftButton p={p} variant="ghost" size="lg" full
                onPress={handleLeave}>
                <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: p.muted }}>
                  {t('safetyExit', lang)}
                </Text>
              </SoftButton>
            </FadeInUp>
          </View>

          {/* Hotline */}
          <FadeInUp delay={440} distance={12}>
            <Animated.View style={{ transform: [{ scale: hotlinePulse }] }}>
              <GlassCard p={p} padding={18} radius={20} style={styles.hotline}>
                <Text style={[styles.hotlineTitle, { color: p.ink }]}>
                  {lang === 'en' ? '24h Support Line' : '24 \u5C0F\u6642\u60C5\u7DD2\u652F\u63F4'}
                </Text>
                <Text style={[styles.hotlineNumber, { color: p.accent }]}>1995</Text>
                <Text style={[styles.hotlineNote, { color: p.muted }]}>
                  {lang === 'en' ? 'Taiwan Mental Health Line' : '\u5B89\u5FC3\u5C08\u7DDA\uFF08\u53F0\u7063\uFF09'}
                </Text>
              </GlassCard>
            </Animated.View>
          </FadeInUp>

          {/* Footer note */}
          <FadeInUp delay={540} distance={8}>
            <Text style={[styles.footer, { color: p.muted }]}>{t('safetyFooter', lang)}</Text>
          </FadeInUp>
        </ScrollView>
      </SafeAreaView>
    </VaporBackground>
  );
}

const styles = StyleSheet.create({
  container:    { flex: 1, padding: 28, gap: 0 },
  backBtn:      { paddingBottom: 20 },
  backText:     { fontFamily: 'NotoSerifTC-Regular', fontSize: 13 },
  header:       { gap: 12, marginBottom: 32 },
  title:        { fontFamily: 'NotoSerifTC-Regular', fontSize: 34, lineHeight: 44 },
  blurb:        { fontFamily: 'NotoSerifTC-Regular', fontSize: 15, lineHeight: 24 },
  actions:      { gap: 10, marginBottom: 28 },
  hotline:      { alignItems: 'center', gap: 6, marginBottom: 28 },
  hotlineTitle: { fontFamily: 'NotoSerifTC-Regular', fontSize: 13 },
  hotlineNumber:{ fontFamily: 'Inter-Regular', fontSize: 32, fontWeight: '300', letterSpacing: 4 },
  hotlineNote:  { fontFamily: 'NotoSerifTC-Regular', fontSize: 12 },
  footer:       { fontFamily: 'NotoSerifTC-Regular', fontSize: 11, textAlign: 'center', lineHeight: 18, opacity: 0.7 },
});
