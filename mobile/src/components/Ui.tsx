import React from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, TextInput, View, type TextInputProps, type StyleProp, type ViewStyle } from 'react-native';
import { colors } from '../theme/colors';

export function BrandMark({ size = 42 }: { size?: number }) {
  return (
    <View style={[styles.brandMark, { width: size, height: size, borderRadius: size * 0.3 }]}>
      <Text style={{ color: '#FFFFFF', fontSize: size * 0.54, fontWeight: '900', lineHeight: size * 0.78 }}>₹</Text>
    </View>
  );
}

export function Button({ title, onPress, loading = false, disabled = false, variant = 'primary', style, icon }: {
  title: string; onPress: () => void; loading?: boolean; disabled?: boolean;
  variant?: 'primary' | 'secondary' | 'outline' | 'danger'; style?: StyleProp<ViewStyle>; icon?: string;
}) {
  const isDisabled = disabled || loading;
  return (
    <Pressable accessibilityRole="button" accessibilityState={{ disabled: isDisabled, busy: loading }} onPress={onPress} disabled={isDisabled}
      style={({ pressed }) => [styles.button, buttonVariants[variant], style, pressed && !isDisabled && styles.pressed, isDisabled && styles.disabled]}>
      {loading ? <ActivityIndicator size="small" color={variant === 'secondary' || variant === 'outline' ? colors.primary : '#FFFFFF'} /> : null}
      {!loading && icon ? <Text style={[styles.buttonIcon, variant === 'secondary' || variant === 'outline' ? { color: colors.primary } : { color: '#FFFFFF' }]}>{icon}</Text> : null}
      <Text style={[styles.buttonText, variant === 'secondary' || variant === 'outline' ? { color: colors.primary } : { color: '#FFFFFF' }]}>{title}</Text>
    </Pressable>
  );
}

export function TextField({ label, error, containerStyle, ...props }: TextInputProps & { label: string; error?: string; containerStyle?: ViewStyle }) {
  return (
    <View style={[styles.fieldWrap, containerStyle]}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        {...props}
        accessibilityLabel={label}
        placeholderTextColor={colors.muted}
        style={[styles.input, props.multiline && styles.multiline, error && styles.inputError, props.style]}
      />
      {error ? <Text style={styles.fieldError}>{error}</Text> : null}
    </View>
  );
}

export function Surface({ children, style }: { children: React.ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.surface, style]}>{children}</View>;
}

export function Notice({ message, tone = 'info' }: { message: string; tone?: 'info' | 'error' | 'success' }) {
  return <View style={[styles.notice, noticeVariants[tone]]}><Text style={styles.noticeIcon}>{tone === 'error' ? '!' : tone === 'success' ? '✓' : 'i'}</Text><Text style={[styles.noticeText, tone === 'error' && { color: colors.red }, tone === 'success' && { color: colors.green }]}>{message}</Text></View>;
}

export function SectionTitle({ eyebrow, title, subtitle }: { eyebrow?: string; title: string; subtitle?: string }) {
  return <View style={styles.sectionTitle}>{eyebrow ? <Text style={styles.eyebrow}>{eyebrow}</Text> : null}<Text style={styles.sectionHeading}>{title}</Text>{subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}</View>;
}

const buttonVariants = StyleSheet.create({
  primary: { backgroundColor: colors.primary },
  secondary: { backgroundColor: colors.primarySoft },
  outline: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border },
  danger: { backgroundColor: colors.red }
});
const noticeVariants = StyleSheet.create({
  info: { backgroundColor: colors.primarySoft, borderColor: '#D9DEFF' },
  error: { backgroundColor: colors.redSoft, borderColor: '#FFD9DC' },
  success: { backgroundColor: colors.greenSoft, borderColor: '#C4EED9' }
});
const styles = StyleSheet.create({
  brandMark: { alignItems: 'center', justifyContent: 'center', backgroundColor: colors.primary, shadowColor: colors.primaryDark, shadowOpacity: 0.2, shadowRadius: 9, shadowOffset: { width: 0, height: 4 }, elevation: 3 },
  button: { minHeight: 50, paddingHorizontal: 18, borderRadius: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, shadowColor: colors.shadow, shadowOpacity: 0.055, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  buttonText: { fontSize: 14, fontWeight: '800', letterSpacing: 0.1 },
  buttonIcon: { fontSize: 18, fontWeight: '800' },
  pressed: { opacity: 0.84, transform: [{ scale: 0.985 }] },
  disabled: { opacity: 0.52, elevation: 0, shadowOpacity: 0 },
  fieldWrap: { gap: 8 },
  fieldLabel: { fontSize: 12, fontWeight: '800', color: colors.ink, letterSpacing: 0.15 },
  input: { minHeight: 52, borderWidth: 1, borderColor: '#DCE3EF', borderRadius: 15, backgroundColor: colors.surface, paddingHorizontal: 15, color: colors.ink, fontSize: 15 },
  inputError: { borderColor: colors.red, backgroundColor: '#FFFAFA' },
  multiline: { minHeight: 100, textAlignVertical: 'top', paddingTop: 14 },
  fieldError: { color: colors.red, fontSize: 12, marginTop: -2, lineHeight: 17 },
  surface: { backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 22, padding: 20, shadowColor: colors.shadow, shadowOpacity: 0.045, shadowRadius: 18, shadowOffset: { width: 0, height: 7 }, elevation: 2 },
  notice: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, borderWidth: 1, borderRadius: 14, padding: 13 },
  noticeIcon: { fontSize: 13, fontWeight: '900', color: colors.primary, marginTop: 1 },
  noticeText: { flex: 1, color: colors.ink, fontSize: 13, lineHeight: 19 },
  sectionTitle: { gap: 6 },
  eyebrow: { color: colors.primary, fontSize: 10, fontWeight: '900', letterSpacing: 1.5, textTransform: 'uppercase' },
  sectionHeading: { color: colors.ink, fontSize: 23, fontWeight: '900', letterSpacing: -0.55 },
  sectionSubtitle: { color: colors.inkSecondary, fontSize: 12, lineHeight: 18 }
});
