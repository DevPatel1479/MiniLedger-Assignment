import React, { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api } from '../services/api';
import { colors } from '../theme/colors';
import { BrandMark, Button, Notice, Surface, TextField } from '../components/Ui';
import type { Session } from '../types';

export function LoginScreen({ onAuthenticated }: { onAuthenticated: (session: Session) => Promise<void> }) {
  const { width } = useWindowDimensions();
  const wide = width >= 820;
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const normalizedPhone = phone.trim().replace(/[\s()-]/g, '');

  const handleRequestOtp = async () => {
    const digits = normalizedPhone.startsWith('+') ? normalizedPhone.slice(1) : normalizedPhone;
    if (!/^\d{10,15}$/.test(digits) || digits.startsWith('0')) {
      setError('Enter a valid phone number with 10–15 digits, including country code if needed.');
      return;
    }
    setBusy(true); setError(''); setNotice('');
    try {
      await api.requestOtp(normalizedPhone);
      setStep('OTP');
      setNotice('A demo OTP was generated. Check the terminal where the API server is running.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not request an OTP. Please try again.');
    } finally { setBusy(false); }
  };

  const handleVerifyOtp = async () => {
    if (!/^\d{6}$/.test(otp.trim())) { setError('Enter the 6-digit OTP printed in the API server terminal.'); return; }
    setBusy(true); setError('');
    try {
      const result = await api.verifyOtp(normalizedPhone, otp.trim());
      await onAuthenticated({ token: result.token, phone: result.user.phone });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not verify the OTP.');
    } finally { setBusy(false); }
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.page, wide && styles.pageWide]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* HERO */}
        <View style={[styles.hero, wide && styles.heroWide]}>
          <View style={styles.heroDecorationOne} />
          <View style={styles.heroDecorationTwo} />

          <View style={styles.brandRow}>
            <BrandMark size={wide ? 43 : 38} />
            <Text style={styles.brandName}>MiniLedger</Text>
            {wide ? (
              <View style={styles.demoTag}><Text style={styles.demoTagText}>PERSONAL FINANCE</Text></View>
            ) : null}
          </View>

          <View style={[styles.heroContent, wide && styles.heroContentWide]}>
            {wide ? (
              <View style={styles.heroKicker}>
                <View style={styles.kickerDot} />
                <Text style={styles.heroKickerText}>A little clarity goes a long way</Text>
              </View>
            ) : null}
            <Text style={[styles.heroTitle, wide && styles.heroTitleWide]}>
              Good friendships.{'\n'}Clear finances.
            </Text>
            <Text style={[styles.heroSubtitle, wide && styles.heroSubtitleWide]}>
              Remember who owes what, keep an eye on due dates, and give every loan a clear ending.
            </Text>

            {/* Feature list only on wide screens so the form is visible right away on phones */}
            {wide ? (
              <View style={styles.featureList}>
                <Feature icon="↗" title="See the full picture" subtitle="Lent, repaid and overdue — at a glance." />
                <Feature icon="✓" title="No awkward guesswork" subtitle="Track due dates and mark repayments." />
                <Feature icon="▧" title="Keep the receipt" subtitle="Attach a photo to any loan entry." />
              </View>
            ) : null}
          </View>

          {wide ? (
            <View style={styles.heroBottom}>
              <Text style={styles.heroBottomText}>SIMPLE TRACKING · MORE PEACE OF MIND</Text>
              <Text style={styles.heroDots}>● ● ●</Text>
            </View>
          ) : null}
        </View>

        {/* AUTH */}
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={[styles.authArea, wide && styles.authAreaWide]}
        >
          <Surface style={[styles.authCard, !wide && styles.authCardMobile]}>
            <View style={styles.authHeader}>
              <View style={styles.authIcon}>
                <Text style={styles.authIconText}>{step === 'PHONE' ? '✦' : '⌁'}</Text>
              </View>
              <View style={styles.authHeaderText}>
                <Text style={styles.formEyebrow}>{step === 'PHONE' ? 'WELCOME BACK' : 'ONE LAST STEP'}</Text>
                <Text style={styles.formTitle}>{step === 'PHONE' ? 'Sign in to your ledger' : 'Verify your number'}</Text>
              </View>
            </View>
            <Text style={styles.formSubtitle}>
              {step === 'PHONE'
                ? 'Use your phone number to access your personal loan tracker.'
                : `Enter the 6-digit code generated for ${normalizedPhone}.`}
            </Text>

            {error ? <Notice message={error} tone="error" /> : null}
            {notice ? <Notice message={notice} tone="success" /> : null}

            {step === 'PHONE' ? (
              <View style={styles.formFields}>
                <TextField
                  label="Phone number"
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="e.g. +91 98765 43210"
                  keyboardType="phone-pad"
                  autoComplete="tel"
                  textContentType="telephoneNumber"
                  returnKeyType="done"
                  onSubmitEditing={() => void handleRequestOtp()}
                />
                <Text style={styles.helperText}>10–15 digits. Use your country code for international numbers.</Text>
                <Button title="Send demo OTP" icon="→" onPress={() => void handleRequestOtp()} loading={busy} />
              </View>
            ) : (
              <View style={styles.formFields}>
                <TextField
                  label="6-digit OTP"
                  value={otp}
                  onChangeText={(value) => setOtp(value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="••••••"
                  keyboardType="number-pad"
                  autoComplete="one-time-code"
                  maxLength={6}
                  returnKeyType="done"
                  onSubmitEditing={() => void handleVerifyOtp()}
                />
                <Text style={styles.helperText}>For this assignment, the OTP is printed only in the API server terminal.</Text>
                <Button title="Verify and continue" icon="✓" onPress={() => void handleVerifyOtp()} loading={busy} />
                <Pressable
                  onPress={() => { setStep('PHONE'); setOtp(''); setError(''); setNotice(''); }}
                  style={styles.backLink}
                >
                  <Text style={styles.backLinkText}>← Change phone number</Text>
                </Pressable>
                <Pressable onPress={() => void handleRequestOtp()} disabled={busy} style={styles.resendLink}>
                  <Text style={styles.resendLinkText}>Request a new OTP</Text>
                </Pressable>
              </View>
            )}

            <View style={styles.separator} />
            <View style={styles.securityLine}>
              <Text style={styles.securityIcon}>♙</Text>
              <Text style={styles.securityText}>Your entries are associated with your phone-number account.</Text>
            </View>
          </Surface>
          <Text style={styles.legalText}>DEMO SIGN-IN · NO SMS IS SENT</Text>
        </KeyboardAvoidingView>
      </ScrollView>
    </SafeAreaView>
  );
}

function Feature({ icon, title, subtitle }: { icon: string; title: string; subtitle: string }) {
  return (
    <View style={styles.feature}>
      <View style={styles.featureIcon}><Text style={styles.featureIconText}>{icon}</Text></View>
      <View style={styles.featureText}>
        <Text style={styles.featureTitle}>{title}</Text>
        <Text style={styles.featureSubtitle}>{subtitle}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.background },
  scroll: { flex: 1, backgroundColor: colors.background },
  page: { flexGrow: 1, padding: 16, paddingBottom: 28, gap: 16 },
  pageWide: {
    flexDirection: 'row', alignItems: 'stretch', justifyContent: 'center', gap: 26,
    paddingHorizontal: 32, paddingVertical: 28, maxWidth: 1440, width: '100%', alignSelf: 'center',
  },

  // Hero – compact on mobile, full on wide
  hero: {
    borderRadius: 26, backgroundColor: '#292D78', paddingHorizontal: 22, paddingTop: 22, paddingBottom: 26,
    overflow: 'hidden', gap: 22,
  },
  heroWide: { flex: 1, maxWidth: 690, minHeight: 680, padding: 36, justifyContent: 'space-between' },
  heroDecorationOne: {
    position: 'absolute', width: 260, height: 260, borderRadius: 130, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)', top: -110, right: -70,
  },
  heroDecorationTwo: {
    position: 'absolute', width: 360, height: 360, borderRadius: 180, borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.075)', bottom: -230, left: -120,
  },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  brandName: { color: '#FFFFFF', fontSize: 21, fontWeight: '900', letterSpacing: -0.45 },
  demoTag: {
    paddingHorizontal: 10, paddingVertical: 6, borderRadius: 100, backgroundColor: 'rgba(255,255,255,0.13)',
    marginLeft: 'auto', borderWidth: 1, borderColor: 'rgba(255,255,255,0.1)',
  },
  demoTagText: { fontSize: 9, color: '#E7E9FF', fontWeight: '900', letterSpacing: 0.85 },
  heroContent: { gap: 10 },
  heroContentWide: { marginTop: 45, maxWidth: 505, gap: 15 },
  heroKicker: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  kickerDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: '#8AF0C3' },
  heroKickerText: { color: '#D9DFFF', fontSize: 12, fontWeight: '800' },
  heroTitle: { fontSize: 30, lineHeight: 36, fontWeight: '900', letterSpacing: -0.9, color: '#FFFFFF' },
  heroTitleWide: { fontSize: 44, lineHeight: 50, letterSpacing: -1.4 },
  heroSubtitle: { fontSize: 14, lineHeight: 21, color: '#E0E4FF' },
  heroSubtitleWide: { fontSize: 15, lineHeight: 23, maxWidth: 425 },
  featureList: { marginTop: 7, gap: 14 },
  feature: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  featureIcon: {
    width: 38, height: 38, borderRadius: 13, backgroundColor: 'rgba(255,255,255,0.13)', borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.06)', alignItems: 'center', justifyContent: 'center',
  },
  featureIconText: { fontSize: 18, color: '#FFFFFF', fontWeight: '900' },
  featureText: { flex: 1, gap: 3 },
  featureTitle: { fontSize: 13, fontWeight: '900', color: '#FFFFFF' },
  featureSubtitle: { fontSize: 12, lineHeight: 17, color: '#D8DEFF' },
  heroBottom: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  heroBottomText: { color: '#C1C9FF', fontSize: 9, fontWeight: '900', letterSpacing: 1.25 },
  heroDots: { color: '#99A4FF', fontSize: 9 },

  // Auth
  authArea: { justifyContent: 'center', gap: 12, maxWidth: 560, alignSelf: 'center', width: '100%' },
  authAreaWide: { flex: 0, width: 430, maxWidth: 430, alignSelf: 'center' },
  authCard: { padding: 24, gap: 14, borderRadius: 25 },
  authCardMobile: { padding: 20 },
  authHeader: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  authHeaderText: { flex: 1, gap: 3 },
  authIcon: {
    width: 46, height: 46, borderRadius: 15, backgroundColor: colors.primarySoft, borderWidth: 1,
    borderColor: '#E0E5FF', alignItems: 'center', justifyContent: 'center',
  },
  authIconText: { color: colors.primary, fontSize: 22, fontWeight: '900' },
  formEyebrow: { fontSize: 10, letterSpacing: 1.55, color: colors.primary, fontWeight: '900' },
  formTitle: { color: colors.ink, fontSize: 22, fontWeight: '900', letterSpacing: -0.6 },
  formSubtitle: { color: colors.inkSecondary, fontSize: 13, lineHeight: 20 },
  formFields: { gap: 15, marginTop: 2 },
  helperText: { color: colors.inkSecondary, fontSize: 11, lineHeight: 17, marginTop: -8 },
  backLink: { alignSelf: 'center', padding: 7 },
  backLinkText: { color: colors.inkSecondary, fontWeight: '800', fontSize: 13 },
  resendLink: { alignSelf: 'center', padding: 6 },
  resendLinkText: { color: colors.primary, fontSize: 13, fontWeight: '800' },
  separator: { height: 1, backgroundColor: colors.border, marginTop: 3 },
  securityLine: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  securityIcon: { fontSize: 15, color: colors.green },
  securityText: { flex: 1, fontSize: 11, lineHeight: 16, color: colors.inkSecondary },
  legalText: { color: colors.muted, fontSize: 9, letterSpacing: 1.25, fontWeight: '900', textAlign: 'center' },
});