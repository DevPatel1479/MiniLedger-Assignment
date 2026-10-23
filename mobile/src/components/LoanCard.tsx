import React from 'react';
import { Image, StyleSheet, Text, View, useWindowDimensions } from 'react-native';
import type { Loan } from '../types';
import { colors } from '../theme/colors';
import { formatCurrency, formatDate, getLoanDisplayStatus, initials } from '../utils/loanHelpers';
import { receiptUrl } from '../services/api';
import { Button } from './Ui';

const statusCopy = {
  OVERDUE: { label: 'OVERDUE', color: colors.red, background: colors.redSoft },
  DUE_TODAY: { label: 'DUE TODAY', color: colors.amber, background: colors.amberSoft },
  UPCOMING: { label: 'UPCOMING', color: colors.green, background: colors.greenSoft },
  REPAID: { label: 'REPAID', color: colors.green, background: colors.greenSoft }
} as const;

export function LoanCard({ loan, onRepay, busy, compact = false }: { loan: Loan; onRepay: (loan: Loan) => void; busy: boolean; compact?: boolean }) {
  const { width } = useWindowDimensions();
  const compactLayout = width < 440;
    const rawStatus = getLoanDisplayStatus(loan);
  const status = (loan.status === 'REPAID' ? 'REPAID' : rawStatus) as keyof typeof statusCopy;
  const statusStyle = statusCopy[status] ?? statusCopy.UPCOMING; // never undefined

  const friendName = (loan.friendName ?? '').trim() || 'Unnamed friend';
  const receipt = loan.receiptPath ? receiptUrl(loan.receiptPath) : null;
  return (
    <View style={[styles.card, status === 'OVERDUE' && styles.overdue, compact && styles.compact]}>
      <View style={[styles.cardMain, compactLayout && styles.cardMainCompact]}>
        <View style={[styles.avatar, status === 'OVERDUE' && styles.avatarOverdue, status === 'REPAID' && styles.avatarRepaid]}><Text style={[styles.avatarText, status === 'OVERDUE' && { color: colors.red }]}>{initials(friendName)}</Text></View>
        <View style={styles.details}>
          <Text style={styles.friendName} numberOfLines={1}>{friendName}</Text>
          <Text style={styles.dueText}>{status === 'REPAID' ? `Repaid${loan.repaidAt ? ` · ${formatDate(loan.repaidAt)}` : ''}` : `Due ${formatDate(loan.dueDate)}`}</Text>
          <View style={styles.metaRow}><View style={[styles.statusPill, { backgroundColor: statusStyle.background }]}><Text style={[styles.statusText, { color: statusStyle.color }]}>{statusStyle.label}</Text></View>{receipt ? <Text style={styles.receiptLabel}>▧ Receipt attached</Text> : null}</View>
        </View>
        {!compactLayout ? <View style={styles.amountArea}>
          <Text style={styles.amount}>{formatCurrency(loan.amount)}</Text>
          {status !== 'REPAID' ? <Button title="Mark repaid" onPress={() => onRepay(loan)} loading={busy} variant="secondary" style={styles.repayButton} /> : <Text style={styles.settledMark}>✓ Settled</Text>}
        </View> : null}
        {receipt && width >= 480 ? <View style={styles.receiptPreview}><Image accessibilityLabel="Receipt attached" source={{ uri: receipt }} style={styles.receiptImage} resizeMode="cover" /></View> : null}
      </View>
      {compactLayout ? <View style={styles.mobileAmountRow}>
        <Text style={styles.amount}>{formatCurrency(loan.amount)}</Text>
        {status !== 'REPAID' ? <Button title="Mark repaid" onPress={() => onRepay(loan)} loading={busy} variant="secondary" style={styles.repayButton} /> : <Text style={styles.settledMark}>✓ Settled</Text>}
      </View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { position: 'relative', gap: 12, padding: 15, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, borderRadius: 19, overflow: 'hidden', shadowColor: colors.shadow, shadowOpacity: 0.025, shadowRadius: 9, shadowOffset: { width: 0, height: 3 }, elevation: 1 },
  overdue: { borderColor: '#F0B8BF', backgroundColor: '#FFFBFB', borderLeftWidth: 4, borderLeftColor: colors.red, paddingLeft: 12 },
  compact: { padding: 12 },
  cardMain: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  cardMainCompact: { alignItems: 'flex-start' },
  avatar: { width: 45, height: 45, borderRadius: 15, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center', flexShrink: 0, borderWidth: 1, borderColor: '#E0E5FF' },
  avatarOverdue: { backgroundColor: colors.redSoft, borderColor: '#FAD7DA' },
  avatarRepaid: { backgroundColor: colors.greenSoft, borderColor: '#CBEEDC' },
  avatarText: { color: colors.primary, fontSize: 13, fontWeight: '900' },
  details: { flex: 1, minWidth: 0, gap: 5 },
  friendName: { color: colors.ink, fontWeight: '900', fontSize: 14, letterSpacing: -0.15 },
  dueText: { color: colors.inkSecondary, fontSize: 11, lineHeight: 15 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 7, flexWrap: 'wrap', marginTop: 2 },
  statusPill: { borderRadius: 7, paddingHorizontal: 8, paddingVertical: 5 },
  statusText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.35 },
  receiptLabel: { fontSize: 10, color: colors.inkSecondary, fontWeight: '600' },
  amountArea: { alignItems: 'flex-end', gap: 8, maxWidth: 150 },
  mobileAmountRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.border },
  amount: { color: colors.ink, fontSize: 16, fontWeight: '900', fontVariant: ['tabular-nums'], letterSpacing: -0.25 },
  repayButton: { minHeight: 36, paddingHorizontal: 12, borderRadius: 11 },
  settledMark: { color: colors.green, fontSize: 11, fontWeight: '900' },
  receiptPreview: { width: 42, height: 42, borderRadius: 11, borderWidth: 1, borderColor: colors.border, overflow: 'hidden' },
  receiptImage: { width: '100%', height: '100%' }
});
