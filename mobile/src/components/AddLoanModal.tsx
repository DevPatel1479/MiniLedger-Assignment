import React, { useMemo, useState } from 'react';
import { ActivityIndicator, Image, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import type { Loan } from '../types';
import { colors } from '../theme/colors';
import { localIsoDate, validateLoanDraft } from '../utils/loanHelpers';
import { Button, Notice, Surface, TextField } from './Ui';

export interface LoanDraft {
  friendName: string;
  amount: number;
  dueDate: string;
}

export function AddLoanModal({ visible, onClose, onSave }: {
  visible: boolean;
  onClose: () => void;
  onSave: (input: LoanDraft, receipt: ImagePicker.ImagePickerAsset | null) => Promise<Loan>;
}) {
  const initialDueDate = useMemo(() => { const date = new Date(); date.setDate(date.getDate() + 7); return localIsoDate(date); }, [visible]);
  const [friendName, setFriendName] = useState('');
  const [amount, setAmount] = useState('');
  const [dueDate, setDueDate] = useState(initialDueDate);
  const [receipt, setReceipt] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [fieldError, setFieldError] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);

  const reset = () => {
    setFriendName(''); setAmount(''); setDueDate(initialDueDate); setReceipt(null); setFieldError(''); setError('');
  };
  const close = () => { if (!saving) { reset(); onClose(); } };

  const chooseReceipt = async () => {
    setError(''); setPicking(true);
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) { setError('Allow photo-library access to attach a receipt.'); return; }
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsEditing: true, quality: 0.82 });
      if (!result.canceled && result.assets[0]) {
        const asset = result.assets[0];
        if (asset.fileSize && asset.fileSize > 5 * 1024 * 1024) { setError('Choose an image smaller than 5 MB.'); return; }
        setReceipt(asset);
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not open the image picker.');
    } finally { setPicking(false); }
  };

  const submit = async () => {
    const message = validateLoanDraft({ friendName, amount, dueDate });
    if (message) { setFieldError(message); return; }
    setFieldError(''); setError(''); setSaving(true);
    try {
      await onSave({ friendName: friendName.trim(), amount: Number(amount), dueDate }, receipt);
      reset(); onClose();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not save this loan. Check the connection and try again.');
    } finally { setSaving(false); }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={close}>
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} accessibilityLabel="Close form" onPress={close} />
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View><Text style={styles.eyebrow}>NEW ENTRY</Text><Text style={styles.title}>Record a loan</Text><Text style={styles.subtitle}>A few details now make repayment easier to track.</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel="Close add loan form" onPress={close} style={styles.closeButton}><Text style={styles.closeText}>×</Text></Pressable>
          </View>
          <ScrollView contentContainerStyle={styles.form} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
            {error ? <Notice message={error} tone="error" /> : null}
            <TextField label="Friend’s name" value={friendName} onChangeText={setFriendName} placeholder="e.g. Aarav Shah" maxLength={80} autoCapitalize="words" returnKeyType="next" />
            <TextField label="Amount (₹)" value={amount} onChangeText={(value) => setAmount(value.replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1'))} placeholder="0.00" keyboardType="decimal-pad" returnKeyType="next" />
            <TextField label="Due date" value={dueDate} onChangeText={setDueDate} placeholder="YYYY-MM-DD" autoCapitalize="none" maxLength={10} />
            <Text style={styles.fieldHint}>Use YYYY-MM-DD, for example 2026-11-15. Past dates are allowed.</Text>
            <View style={styles.receiptBox}>
              <View style={styles.receiptIcon}><Text style={styles.receiptIconText}>▧</Text></View>
              <View style={styles.receiptCopy}><Text style={styles.receiptTitle}>Receipt photo <Text style={styles.optional}>(optional)</Text></Text><Text style={styles.receiptSubtitle}>JPEG, PNG or WebP · up to 5 MB</Text></View>
              <Button title={receipt ? 'Change' : 'Attach'} variant="outline" onPress={() => void chooseReceipt()} loading={picking} style={styles.attachButton} />
            </View>
            {receipt ? <View style={styles.previewRow}><Image source={{ uri: receipt.uri }} style={styles.previewImage} /><View style={{ flex: 1 }}><Text style={styles.previewName} numberOfLines={1}>{receipt.fileName || 'Receipt image selected'}</Text><Text style={styles.previewSub}>{receipt.fileSize ? `${(receipt.fileSize / 1024).toFixed(0)} KB` : 'Ready to upload'}</Text></View><Pressable onPress={() => setReceipt(null)} accessibilityRole="button" accessibilityLabel="Remove receipt"><Text style={styles.removeReceipt}>Remove</Text></Pressable></View> : null}
            {fieldError ? <Notice message={fieldError} tone="error" /> : null}
            <View style={styles.actions}><Button title="Cancel" variant="outline" onPress={close} disabled={saving} style={styles.cancelButton} /><Button title="Save loan" icon="✓" onPress={() => void submit()} loading={saving} style={styles.saveButton} /></View>
            {saving ? <View style={styles.uploadHint}><ActivityIndicator size="small" color={colors.primary} /><Text style={styles.uploadHintText}>Saving entry{receipt ? ' and uploading receipt' : ''}…</Text></View> : null}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.56)', justifyContent: 'flex-end', alignItems: 'center' },
  sheet: { width: '100%', maxWidth: 650, maxHeight: '94%', backgroundColor: colors.background, borderTopLeftRadius: 29, borderTopRightRadius: 29, paddingTop: 25, paddingHorizontal: 20, paddingBottom: Platform.OS === 'web' ? 24 : 30, overflow: 'hidden', borderWidth: 1, borderColor: 'rgba(255,255,255,0.65)' },
  sheetHeader: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', gap: 18, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: colors.border },
  eyebrow: { color: colors.primary, fontSize: 10, letterSpacing: 1.45, fontWeight: '900', marginBottom: 6 },
  title: { color: colors.ink, fontSize: 25, fontWeight: '900', letterSpacing: -0.7 },
  subtitle: { color: colors.inkSecondary, fontSize: 12, lineHeight: 19, marginTop: 5, maxWidth: 430 },
  closeButton: { backgroundColor: colors.surface, width: 39, height: 39, alignItems: 'center', justifyContent: 'center', borderRadius: 14, borderWidth: 1, borderColor: colors.border },
  closeText: { fontSize: 25, color: colors.inkSecondary, lineHeight: 27 },
  form: { gap: 15, paddingTop: 20, paddingBottom: 20 },
  fieldHint: { color: colors.inkSecondary, fontSize: 11, lineHeight: 16, marginTop: -9 },
  receiptBox: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 13, borderRadius: 17, borderWidth: 1, borderColor: '#D7DDF0', borderStyle: 'dashed', backgroundColor: colors.surface },
  receiptIcon: { width: 41, height: 41, backgroundColor: colors.primarySoft, borderRadius: 13, borderWidth: 1, borderColor: '#E2E6FF', alignItems: 'center', justifyContent: 'center' },
  receiptIconText: { color: colors.primary, fontSize: 21, fontWeight: '900' },
  receiptCopy: { flex: 1, gap: 4, minWidth: 0 },
  receiptTitle: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  optional: { fontWeight: '600', color: colors.inkSecondary },
  receiptSubtitle: { color: colors.inkSecondary, fontSize: 10, lineHeight: 14 },
  attachButton: { minHeight: 38, paddingHorizontal: 12, borderRadius: 11 },
  previewRow: { flexDirection: 'row', alignItems: 'center', gap: 11, padding: 11, backgroundColor: colors.greenSoft, borderColor: '#CBEEDC', borderWidth: 1, borderRadius: 14 },
  previewImage: { width: 47, height: 47, borderRadius: 10 },
  previewName: { color: colors.ink, fontWeight: '800', fontSize: 12 },
  previewSub: { color: colors.inkSecondary, fontSize: 10, marginTop: 4 },
  removeReceipt: { color: colors.red, fontSize: 11, fontWeight: '900', padding: 5 },
  actions: { flexDirection: 'row', gap: 10, marginTop: 5 },
  cancelButton: { flex: 1 },
  saveButton: { flex: 1.4 },
  uploadHint: { flexDirection: 'row', alignItems: 'center', gap: 8, justifyContent: 'center', paddingVertical: 3 },
  uploadHintText: { color: colors.inkSecondary, fontSize: 12, fontWeight: '600' }
});
