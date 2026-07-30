// AuthScreen.tsx — Login / Register / Forgot Password
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, KeyboardAvoidingView, Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { DIRECTIONS } from '../lib/theme';
import { t, tAlt } from '../lib/copy';
import { VaporBackground, GlassCard, SoftButton, FadeInUp, Logo } from '../components/ui';
import { syncAfterAuth, useAppStore } from '../hooks/useAppStore';
import { register, login, resetPassword, getCurrentUser } from '../lib/auth';
import { signInWithGoogle, isGoogleAvailable } from '../lib/googleAuth';
import { analytics } from '../lib/analytics';
import { ensureAnonAuth, getUser } from '../lib/db';
import { hapticMedium, hapticSuccess } from '../lib/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

type Mode = 'login' | 'register' | 'forgot';

export default function AuthScreen({ navigation, route }: Props) {
  const { direction, lang, setupDone } = useAppStore();
  const p = DIRECTIONS[direction];
  const [mode, setMode] = useState<Mode>(route.params?.mode ?? 'login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [focused, setFocused] = useState<'email' | 'password' | null>(null);
  const [passwordVisible, setPasswordVisible] = useState(false);

  const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const routeAfterAuth = async () => {
    try {
      const uid = getCurrentUser()?.uid;
      const profile = uid ? await getUser(uid) : null;
      navigation.replace(profile?.setupDone || (!profile && setupDone) ? 'Mood' : 'Setup');
    } catch {
      navigation.replace(setupDone ? 'Mood' : 'Setup');
    }
  };

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError(lang === 'en' ? 'Please fill in all fields' : '請填寫所有欄位');
      return;
    }
    if (!validEmail) {
      setError(lang === 'en' ? 'Please enter a valid email' : '請輸入正確的 Email 格式');
      return;
    }
    setLoading(true);
    setError('');
    const result = await login(email.trim(), password);
    setLoading(false);
    if (result.ok) {
      hapticSuccess();
      await syncAfterAuth();
      await routeAfterAuth();
    } else {
      setError(result.error ?? '登入失敗');
    }
  };

  const handleRegister = async () => {
    if (!email.trim() || !password.trim()) {
      setError(lang === 'en' ? 'Please fill in all fields' : '請填寫所有欄位');
      return;
    }
    if (!validEmail) {
      setError(lang === 'en' ? 'Please enter a valid email' : '請輸入正確的 Email 格式');
      return;
    }
    if (password.length < 6) {
      setError(lang === 'en' ? 'Password must be at least 6 characters' : '密碼至少 6 個字元');
      return;
    }
    setLoading(true);
    setError('');
    const result = await register(email.trim(), password);
    setLoading(false);
    if (result.ok) {
      hapticSuccess();
      await syncAfterAuth();
      await routeAfterAuth();
    } else {
      setError(result.error ?? '註冊失敗');
    }
  };

  const handleGoogle = async () => {
    setLoading(true);
    setError('');
    const result = await signInWithGoogle();
    setLoading(false);
    if (result.ok) {
      hapticSuccess();
      await syncAfterAuth();
      await routeAfterAuth();
    } else if (result.error !== 'cancelled') {
      // Surface the real error for diagnosis (revert to a generic message later),
      // and record it server-side so diagnosis doesn't depend on screenshots.
      analytics.authGoogleError(result.error ?? '?');
      setError((lang === 'en' ? 'Google sign-in failed: ' : 'Google 登入失敗：') + (result.error ?? '?'));
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError(lang === 'en' ? 'Please enter your email' : '請輸入 Email');
      return;
    }
    if (!validEmail) {
      setError(lang === 'en' ? 'Please enter a valid email' : '請輸入正確的 Email 格式');
      return;
    }
    setLoading(true);
    setError('');
    setSuccess('');
    const result = await resetPassword(email.trim());
    setLoading(false);
    if (result.ok) {
      setSuccess(lang === 'en' ? 'Password reset email sent' : '重設密碼信件已寄出');
    } else {
      setError(result.error ?? '重設密碼失敗');
    }
  };

  return (
    <VaporBackground p={p} style={{ flex: 1 }}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView
          style={{ flex: 1 }}
          // 'padding' on BOTH platforms — see ChatScreen for why this is safe.
          behavior="padding"
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {navigation.canGoBack() ? (
              <TouchableOpacity
                onPress={() => navigation.goBack()}
                accessibilityRole="button"
                accessibilityLabel={lang === 'en' ? 'Back to the previous screen' : '回到上一頁'}
                style={[styles.backButton, { backgroundColor: p.surface, borderColor: p.line }]}
              >
                <Text style={[styles.backGlyph, { color: p.ink }]}>‹</Text>
              </TouchableOpacity>
            ) : null}

            {/* Logo */}
            <FadeInUp delay={0} distance={12}>
              <View style={styles.logoWrap}>
                <Logo size={56} showGlow={true} />
              </View>
            </FadeInUp>

            {/* Title */}
            <FadeInUp delay={100} distance={10}>
              <View style={styles.header}>
                <Text style={[styles.title, { color: p.ink }]}>
                  {mode === 'login'
                    ? (lang === 'en' ? 'Welcome back' : '歡迎回來')
                    : mode === 'register'
                    ? (lang === 'en' ? 'Join Candle Whisper' : '加入燭影私語')
                    : (lang === 'en' ? 'Reset password' : '重設密碼')}
                </Text>
                <Text style={[styles.subtitle, { color: p.muted }]}>
                  {mode === 'login'
                    ? (lang === 'en' ? 'Return to the conversations that still feel warm' : '回到那些還有餘溫的對話')
                    : mode === 'register'
                    ? (lang === 'en' ? 'Anonymous by design · adults only' : '不使用真名 · 僅限成年人')
                    : (lang === 'en' ? 'We will send you a reset link' : '我們會寄送重設連結')}
                </Text>
              </View>
            </FadeInUp>

            {/* Form */}
            <FadeInUp delay={200} distance={10}>
              <GlassCard p={p} padding={20} radius={20}>
                {/* Email */}
                <View style={styles.field}>
                  <Text style={[styles.label, { color: p.muted }]}>Email</Text>
                  <TextInput
                    value={email}
                    onChangeText={setEmail}
                    onFocus={() => setFocused('email')}
                    onBlur={() => setFocused(null)}
                    placeholder="email@example.com"
                    placeholderTextColor={p.muted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={[styles.input, { backgroundColor: p.surface, borderColor: focused === 'email' ? p.accent : p.line, borderWidth: focused === 'email' ? 1 : 0.5, color: p.ink }]}
                  />
                </View>

                {/* Password */}
                {mode !== 'forgot' && (
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: p.muted }]}>
                      {lang === 'en' ? 'Password' : '密碼'}
                    </Text>
                    <View style={[
                      styles.passwordWrap,
                      {
                        backgroundColor: p.surface,
                        borderColor: focused === 'password' ? p.accent : p.line,
                        borderWidth: focused === 'password' ? 1 : 0.5,
                      },
                    ]}>
                      <TextInput
                        value={password}
                        onChangeText={setPassword}
                        onFocus={() => setFocused('password')}
                        onBlur={() => setFocused(null)}
                        placeholder="••••••••"
                        placeholderTextColor={p.muted}
                        secureTextEntry={!passwordVisible}
                        autoCapitalize="none"
                        autoCorrect={false}
                        style={[styles.passwordInput, { color: p.ink }]}
                      />
                      <TouchableOpacity
                        accessibilityRole="button"
                        accessibilityLabel={passwordVisible
                          ? (lang === 'en' ? 'Hide password' : '隱藏密碼')
                          : (lang === 'en' ? 'Show password' : '顯示密碼')}
                        onPress={() => setPasswordVisible(value => !value)}
                        style={styles.passwordToggle}
                      >
                        <Text style={[styles.passwordToggleText, { color: p.accent }]}>
                          {passwordVisible
                            ? (lang === 'en' ? 'Hide' : '隱藏')
                            : (lang === 'en' ? 'Show' : '顯示')}
                        </Text>
                      </TouchableOpacity>
                    </View>
                    {mode === 'register' ? (
                      <Text style={[styles.passwordHint, { color: p.muted }]}>
                        {lang === 'en' ? 'Use at least 6 characters' : '至少 6 個字元'}
                      </Text>
                    ) : null}
                  </View>
                )}

                {/* Error */}
                {error ? (
                  <View style={[styles.msgBox, { backgroundColor: 'rgba(224,92,106,0.1)', borderColor: 'rgba(224,92,106,0.3)' }]}>
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: '#e05c6a' }}>{error}</Text>
                  </View>
                ) : null}

                {/* Success */}
                {success ? (
                  <View style={[styles.msgBox, { backgroundColor: 'rgba(76,175,80,0.1)', borderColor: 'rgba(76,175,80,0.3)' }]}>
                    <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 13, color: '#4caf50' }}>{success}</Text>
                  </View>
                ) : null}

                {/* Submit Button */}
                <SoftButton
                  p={p}
                  variant="primary"
                  size="lg"
                  full
                  onPress={mode === 'login' ? handleLogin : mode === 'register' ? handleRegister : handleForgotPassword}
                  disabled={loading}
                >
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 16, color: p.dark ? '#1a1530' : '#fff' }}>
                    {loading
                      ? (lang === 'en' ? 'Loading...' : '載入中...')
                      : mode === 'login'
                      ? (lang === 'en' ? 'Sign in' : '登入')
                      : mode === 'register'
                      ? (lang === 'en' ? 'Register' : '註冊')
                      : (lang === 'en' ? 'Send reset link' : '寄送重設連結')}
                  </Text>
                </SoftButton>
              </GlassCard>
            </FadeInUp>

            {/* Google sign-in */}
            {(mode === 'login' || mode === 'register') && isGoogleAvailable() && (
              <FadeInUp delay={250} distance={8}>
                <TouchableOpacity onPress={handleGoogle} disabled={loading}
                  style={[styles.googleBtn, { borderColor: p.line, backgroundColor: p.surface }]}>
                  <Text style={{ fontFamily: 'NotoSerifTC-Regular', fontSize: 15, color: p.ink }}>
                    {lang === 'en' ? 'Continue with Google' : '用 Google 繼續'}
                  </Text>
                </TouchableOpacity>
              </FadeInUp>
            )}

            {/* Links */}
            <FadeInUp delay={300} distance={8}>
              <View style={styles.links}>
                {mode === 'login' && (
                  <>
                    <TouchableOpacity onPress={() => { setMode('forgot'); setError(''); setSuccess(''); }}>
                      <Text style={[styles.link, { color: p.muted }]}>
                        {lang === 'en' ? 'Forgot password?' : '忘記密碼？'}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => { setMode('register'); setError(''); setSuccess(''); }}>
                      <Text style={[styles.link, { color: p.accent }]}>
                        {lang === 'en' ? 'Create account' : '建立帳號'}
                      </Text>
                    </TouchableOpacity>
                  </>
                )}
                {mode === 'register' && (
                  <TouchableOpacity onPress={() => { setMode('login'); setError(''); setSuccess(''); }}>
                    <Text style={[styles.link, { color: p.accent }]}>
                      {lang === 'en' ? 'Already have an account? Sign in' : '已有帳號？登入'}
                    </Text>
                  </TouchableOpacity>
                )}
                {mode === 'forgot' && (
                  <TouchableOpacity onPress={() => { setMode('login'); setError(''); setSuccess(''); }}>
                    <Text style={[styles.link, { color: p.accent }]}>
                      {lang === 'en' ? 'Back to sign in' : '返回登入'}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            </FadeInUp>

            {/* Guest option */}
            {mode === 'login' && (
              <FadeInUp delay={400} distance={8}>
                <TouchableOpacity
                  onPress={async () => {
                    try { await ensureAnonAuth(); } catch {}
                    await syncAfterAuth();
                    hapticSuccess();
                    navigation.replace('Onboarding');
                  }}
                  style={styles.guestBtn}
                >
                  <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 13, color: p.muted }}>
                    {lang === 'en' ? 'Continue as guest' : '先以訪客身分體驗'}
                  </Text>
                </TouchableOpacity>
              </FadeInUp>
            )}

            {mode === 'register' && (
              <Text style={[styles.legal, { color: p.muted }]}>
                {lang === 'en' ? 'By creating an account, you confirm you are 18+ and agree to our ' : '建立帳號即代表你已年滿 18 歲，並同意'}
                <Text
                  accessibilityRole="link"
                  onPress={() => Linking.openURL('https://thirties-landing.vercel.app/privacy').catch(() => {})}
                  style={{ color: p.accent, textDecorationLine: 'underline' }}
                >
                  {lang === 'en' ? 'Privacy Policy' : '隱私權政策'}
                </Text>
                {lang === 'en' ? '.' : '。'}
              </Text>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </VaporBackground>
  );
}

const styles = StyleSheet.create({
  scroll:     { padding: 28, paddingBottom: 48, justifyContent: 'center', flexGrow: 1, width: '100%', maxWidth: 560, alignSelf: 'center' },
  backButton: { position: 'absolute', top: 14, left: 22, zIndex: 2, width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  backGlyph:  { fontFamily: 'NotoSerifTC-Regular', fontSize: 25, lineHeight: 30, marginTop: -2 },
  logoWrap:   { alignItems: 'center', marginBottom: 24 },
  header:     { alignItems: 'center', marginBottom: 24, gap: 6 },
  title:      { fontFamily: 'NotoSerifTC-Regular', fontSize: 28, letterSpacing: 2 },
  subtitle:   { fontFamily: 'NotoSerifTC-Regular', fontSize: 14 },
  field:      { marginBottom: 16 },
  label:      { fontFamily: 'Inter-Regular', fontSize: 12, marginBottom: 6, letterSpacing: 1 },
  input:      { fontFamily: 'NotoSerifTC-Regular', fontSize: 15, padding: 14, borderRadius: 14, borderWidth: 0.5 },
  passwordWrap: { minHeight: 50, borderRadius: 14, flexDirection: 'row', alignItems: 'center' },
  passwordInput: { flex: 1, fontFamily: 'NotoSerifTC-Regular', fontSize: 15, paddingVertical: 14, paddingLeft: 14 },
  passwordToggle: { minWidth: 58, minHeight: 48, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 10 },
  passwordToggleText: { fontFamily: 'NotoSerifTC-Regular', fontSize: 12 },
  passwordHint: { fontFamily: 'Inter-Regular', fontSize: 10.5, marginTop: 6 },
  msgBox:     { padding: 12, borderRadius: 12, borderWidth: 0.5, marginBottom: 16 },
  links:      { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 20 },
  link:       { fontFamily: 'NotoSerifTC-Regular', fontSize: 13 },
  googleBtn:  { marginTop: 14, height: 50, borderRadius: 14, borderWidth: 0.5, alignItems: 'center', justifyContent: 'center' },
  guestBtn:   { alignItems: 'center', marginTop: 24, paddingVertical: 8 },
  legal:      { fontFamily: 'NotoSerifTC-Regular', fontSize: 11, lineHeight: 18, textAlign: 'center', marginTop: 20, paddingHorizontal: 10 },
});
