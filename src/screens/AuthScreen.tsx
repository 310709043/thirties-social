// AuthScreen.tsx — Login / Register / Forgot Password
import React, { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, ScrollView,
  StyleSheet, Alert, KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../navigation';
import { DIRECTIONS } from '../lib/theme';
import { t, tAlt } from '../lib/copy';
import { VaporBackground, GlassCard, SoftButton, FadeInUp, Logo } from '../components/ui';
import { useAppStore } from '../hooks/useAppStore';
import { register, login, resetPassword } from '../lib/auth';
import { hapticMedium, hapticSuccess } from '../lib/haptics';

type Props = NativeStackScreenProps<RootStackParamList, 'Auth'>;

type Mode = 'login' | 'register' | 'forgot';

export default function AuthScreen({ navigation }: Props) {
  const { direction, lang } = useAppStore();
  const p = DIRECTIONS[direction];
  const [mode, setMode] = useState<Mode>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async () => {
    if (!email.trim() || !password.trim()) {
      setError(lang === 'en' ? 'Please fill in all fields' : '請填寫所有欄位');
      return;
    }
    setLoading(true);
    setError('');
    const result = await login(email.trim(), password);
    setLoading(false);
    if (result.ok) {
      hapticSuccess();
      navigation.replace('Mood');
    } else {
      setError(result.error ?? '登入失敗');
    }
  };

  const handleRegister = async () => {
    if (!email.trim() || !password.trim()) {
      setError(lang === 'en' ? 'Please fill in all fields' : '請填寫所有欄位');
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
      navigation.replace('Setup');
    } else {
      setError(result.error ?? '註冊失敗');
    }
  };

  const handleForgotPassword = async () => {
    if (!email.trim()) {
      setError(lang === 'en' ? 'Please enter your email' : '請輸入 Email');
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
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <ScrollView
            contentContainerStyle={styles.scroll}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
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
                    ? (lang === 'en' ? 'Join us' : '加入第卅者')
                    : (lang === 'en' ? 'Reset password' : '重設密碼')}
                </Text>
                <Text style={[styles.subtitle, { color: p.muted }]}>
                  {mode === 'login'
                    ? (lang === 'en' ? 'Sign in to continue' : '登入以繼續')
                    : mode === 'register'
                    ? (lang === 'en' ? 'Create your account' : '建立你的帳號')
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
                    placeholder="email@example.com"
                    placeholderTextColor={p.muted}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    style={[styles.input, { backgroundColor: p.surface, borderColor: p.line, color: p.ink }]}
                  />
                </View>

                {/* Password */}
                {mode !== 'forgot' && (
                  <View style={styles.field}>
                    <Text style={[styles.label, { color: p.muted }]}>
                      {lang === 'en' ? 'Password' : '密碼'}
                    </Text>
                    <TextInput
                      value={password}
                      onChangeText={setPassword}
                      placeholder="••••••••"
                      placeholderTextColor={p.muted}
                      secureTextEntry
                      style={[styles.input, { backgroundColor: p.surface, borderColor: p.line, color: p.ink }]}
                    />
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
                  onPress={() => navigation.replace('Onboarding')}
                  style={styles.guestBtn}
                >
                  <Text style={{ fontFamily: 'EBGaramond-Italic', fontSize: 13, color: p.muted }}>
                    {lang === 'en' ? 'Continue as guest' : '先以訪客身分體驗'}
                  </Text>
                </TouchableOpacity>
              </FadeInUp>
            )}
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </VaporBackground>
  );
}

const styles = StyleSheet.create({
  scroll:     { padding: 28, paddingBottom: 48, justifyContent: 'center', flexGrow: 1 },
  logoWrap:   { alignItems: 'center', marginBottom: 24 },
  header:     { alignItems: 'center', marginBottom: 24, gap: 6 },
  title:      { fontFamily: 'NotoSerifTC-Regular', fontSize: 28, letterSpacing: 2 },
  subtitle:   { fontFamily: 'NotoSerifTC-Regular', fontSize: 14 },
  field:      { marginBottom: 16 },
  label:      { fontFamily: 'Inter-Regular', fontSize: 12, marginBottom: 6, letterSpacing: 1 },
  input:      { fontFamily: 'NotoSerifTC-Regular', fontSize: 15, padding: 14, borderRadius: 14, borderWidth: 0.5 },
  msgBox:     { padding: 12, borderRadius: 12, borderWidth: 0.5, marginBottom: 16 },
  links:      { flexDirection: 'row', justifyContent: 'center', gap: 20, marginTop: 20 },
  link:       { fontFamily: 'NotoSerifTC-Regular', fontSize: 13 },
  guestBtn:   { alignItems: 'center', marginTop: 24, paddingVertical: 8 },
});
