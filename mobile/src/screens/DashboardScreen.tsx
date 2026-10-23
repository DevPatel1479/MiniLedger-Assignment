import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, RefreshControl, ScrollView, StyleSheet, Text, TextInput, View, useWindowDimensions } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { AddLoanModal, type LoanDraft } from '../components/AddLoanModal';
import { BrandMark, Button, Notice, Surface, SectionTitle } from '../components/Ui';
import { LoanCard } from '../components/LoanCard';
import { api } from '../services/api';
import { colors } from '../theme/colors';
import type { Loan, Summary } from '../types';
import { formatCurrency, getLoanDisplayStatus } from '../utils/loanHelpers';

 type LoanFilter = 'ALL' | 'PENDING' | 'OVERDUE' | 'REPAID';
const filterOptions: { key: LoanFilter; label: string }[] = [
  { key: 'ALL', label: 'All entries' },
  { key: 'PENDING', label: 'Pending' },
  { key: 'OVERDUE', label: 'Overdue' },
  { key: 'REPAID', label: 'Repaid' }
];

const sanitizeLoans = (items: Loan[] | null | undefined): Loan[] => {
  const byId = new Map<string, Loan>();
  for (const item of items ?? []) {
    if (item && item.id) byId.set(item.id, item);
  }
  return Array.from(byId.values());
};

export function DashboardScreen({ token, phone, onLogout }: { token: string; phone: string; onLogout: () => Promise<void> }) {
  const { width } = useWindowDimensions();
  const wide = width >= 850;
  const compactLayout = width < 520;
  const latestRequest = useRef(0);
  const [loans, setLoans] = useState<Loan[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const [toast, setToast] = useState('');
  const [activeFilter, setActiveFilter] = useState<LoanFilter>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [adding, setAdding] = useState(false);
  const [busyLoanId, setBusyLoanId] = useState<string | null>(null);
  const [loggingOut, setLoggingOut] = useState(false);

  const loadData = useCallback(async (showMainLoading = false) => {
  const requestId = ++latestRequest.current;
  if (showMainLoading) setLoading(true); else setRefreshing(true);
  setError('');
  try {
    const [nextLoans, nextSummary] = await Promise.all([api.getLoans(token), api.getSummary(token)]);
    if (requestId !== latestRequest.current) return;
    setLoans(sanitizeLoans(nextLoans));
    setSummary(nextSummary);
  } catch (cause) {
    if (requestId !== latestRequest.current) return;
    setError(cause instanceof Error ? cause.message : 'Could not load your ledger. Please try again.');
  } finally {
    if (requestId === latestRequest.current) { setLoading(false); setRefreshing(false); }
  }
}, [token]);

  useEffect(() => { void loadData(true); }, [loadData]);

  const counts = useMemo(() => ({
    ALL: loans.length,
    PENDING: loans.filter((loan) => loan.status === 'PENDING').length,
    OVERDUE: loans.filter((loan) => getLoanDisplayStatus(loan) === 'OVERDUE').length,
    REPAID: loans.filter((loan) => loan.status === 'REPAID').length
  }), [loans]);

  const filteredLoans = useMemo(() => loans.filter((loan) => {
    const status = getLoanDisplayStatus(loan);
    const matchesFilter = activeFilter === 'ALL' || (activeFilter === 'PENDING' && loan.status === 'PENDING') || (activeFilter === 'OVERDUE' && status === 'OVERDUE') || (activeFilter === 'REPAID' && loan.status === 'REPAID');
    return matchesFilter && (loan.friendName ?? '').toLowerCase().includes(searchTerm.trim().toLowerCase());
  }), [loans, activeFilter, searchTerm]);

  const handleAdd = async (input: LoanDraft, receipt: ImagePicker.ImagePickerAsset | null): Promise<Loan> => {
    const created = await api.createLoan(token, input, receipt);
    setToast(`Loan to ${created.friendName} saved${receipt ? ' with receipt' : ''}.`);
    await loadData(false);
    return created;
  };

  const handleRepay = async (loan: Loan) => {
    setBusyLoanId(loan.id);
    setError('');
    setToast('');

    try {
      // Use the API's confirmed result to update this row in place instead of
      // replacing the whole list. This keeps Android from briefly rendering a
      // stale/clipped card while the post-repayment list request is in flight.
      const updatedLoan = await api.markRepaid(token, loan.id);

      // Ignore any earlier list refresh that may still contain the PENDING row.
      latestRequest.current += 1;
      setLoading(false);
      setRefreshing(false);

      setLoans((currentLoans) => currentLoans.map((currentLoan) => {
        if (currentLoan.id !== loan.id) return currentLoan;
        return {
          ...currentLoan,
          friendName: updatedLoan.friendName || currentLoan.friendName,
          amount: Number.isFinite(updatedLoan.amount) ? updatedLoan.amount : currentLoan.amount,
          dueDate: updatedLoan.dueDate || currentLoan.dueDate,
          receiptPath: updatedLoan.receiptPath ?? currentLoan.receiptPath,
          createdAt: updatedLoan.createdAt || currentLoan.createdAt,
          userId: updatedLoan.userId || currentLoan.userId,
          status: 'REPAID',
          repaidAt: updatedLoan.repaidAt || new Date().toISOString()
        };
      }));
      setToast(`${loan.friendName}’s loan marked as repaid.`);

      // Refresh the totals separately so the list/cards are not needlessly
      // unmounted and recreated after every repayment.
      try {
        const nextSummary = await api.getSummary(token);
        setSummary(nextSummary);
      } catch {
        setError('Loan was marked as repaid, but the summary could not refresh. Pull down to refresh.');
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not update the loan.');
    } finally {
      setBusyLoanId(null);
    }
  };

  const handleLogout = async () => {
    setLoggingOut(true);
    try { await onLogout(); } finally { setLoggingOut(false); }
  };

  const summaryCards = summary ? [
    { label: 'TOTAL LENT', value: summary.totalLent, icon: '↗', note: `${loans.length} recorded ${loans.length === 1 ? 'entry' : 'entries'}`, tone: 'primary' as const },
    { label: 'TOTAL REPAID', value: summary.totalRepaid, icon: '✓', note: `${summary.repaidCount} fully repaid`, tone: 'green' as const },
    { label: 'OVERDUE AMOUNT', value: summary.overdueAmount, icon: '!', note: `${counts.OVERDUE} ${counts.OVERDUE === 1 ? 'entry' : 'entries'} need attention`, tone: 'red' as const },
    { label: 'STILL OUTSTANDING', value: Math.max(0, summary.totalLent - summary.totalRepaid), icon: '◷', note: `${summary.pendingCount} open ${summary.pendingCount === 1 ? 'loan' : 'loans'}`, tone: 'amber' as const }
  ] : [];

  return (
    <View style={styles.page}>
      <ScrollView
        contentContainerStyle={[styles.content, wide && styles.contentWide]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void loadData(false)} tintColor={colors.primary} colors={[colors.primary]} />}
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={false}
      >
        <View style={styles.header}>
          <View style={styles.brandLine}><BrandMark size={38} /><View><Text style={styles.brandName}>MiniLedger</Text><Text style={styles.brandTagline}>Your money, remembered.</Text></View></View>
          <View style={styles.headerActions}><View style={styles.accountPill}><View style={styles.accountDot} /><Text style={styles.accountPhone} numberOfLines={1}>{phone}</Text></View><Button title="Sign out" onPress={() => void handleLogout()} loading={loggingOut} variant="outline" style={styles.signOutButton} /></View>
        </View>

        <View style={[styles.welcomePanel, compactLayout && styles.welcomePanelNarrow, wide && styles.welcomePanelWide]}>
          <View style={[styles.welcomeCopy, compactLayout && styles.welcomeCopyNarrow]}><Text style={styles.welcomeEyebrow}>YOUR PERSONAL LEDGER</Text><Text style={styles.welcomeTitle}>Your finances, at a glance.</Text><Text style={styles.welcomeSubtitle}>Every loan in one place, so you can focus on the friendship — not the follow-up.</Text></View>
          <Button title="Add a loan" icon="＋" onPress={() => setAdding(true)} style={styles.addButton} />
          <View style={styles.welcomeCircleOne} /><View style={styles.welcomeCircleTwo} />
        </View>

        <View style={styles.sectionHeaderRow}><SectionTitle eyebrow="AT A GLANCE" title="Your money snapshot" subtitle="A clear picture of what you’ve lent and what’s come back." /><Text style={styles.currencyLabel}>IN INDIAN RUPEES (₹)</Text></View>

        {loading && !summary ? <View style={styles.loadingPanel}><ActivityIndicator color={colors.primary} /><Text style={styles.loadingText}>Loading your ledger…</Text></View> : summary ? (
          <View style={styles.summaryGrid}>{summaryCards.map((card) => <SummaryCard key={card.label} {...card} wide={wide} />)}</View>
        ) : <Surface style={styles.emptySummary}><Text style={styles.emptySummaryTitle}>Your snapshot is not available yet</Text><Text style={styles.emptySummaryText}>Check your connection and try loading the ledger again.</Text><Button title="Retry" onPress={() => void loadData(true)} variant="outline" /></Surface>}

        {error ? <Notice message={error} tone="error" /> : null}
        {toast ? <Pressable accessibilityRole="button" accessibilityLabel="Dismiss notification" onPress={() => setToast('')} style={styles.toast}><Text style={styles.toastCheck}>✓</Text><Text style={styles.toastText}>{toast}</Text><Text style={styles.dismiss}>DISMISS</Text></Pressable> : null}

        <View style={styles.listHeader}><SectionTitle eyebrow="YOUR RECORDS" title="Loan entries" subtitle="Overdue loans are highlighted so nothing slips through." /><Button title="＋ New entry" onPress={() => setAdding(true)} variant="secondary" style={styles.newEntryButton} /></View>

        <Surface style={styles.listPanel}>
          <View style={styles.searchWrap}><Text style={styles.searchIcon}>⌕</Text><TextInput value={searchTerm} onChangeText={setSearchTerm} placeholder="Search by friend name…" placeholderTextColor={colors.muted} accessibilityLabel="Search loans by friend name" style={styles.searchInput} returnKeyType="search" /></View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterRow}>
            {filterOptions.map((filter) => {
              const active = activeFilter === filter.key;
              return <Pressable key={filter.key} onPress={() => setActiveFilter(filter.key)} accessibilityRole="button" accessibilityState={{ selected: active }} style={[styles.filterChip, active && styles.filterChipActive]}><Text style={[styles.filterText, active && styles.filterTextActive]}>{filter.label}</Text><View style={[styles.filterCount, active && styles.filterCountActive]}><Text style={[styles.filterCountText, active && styles.filterCountTextActive]}>{counts[filter.key]}</Text></View></Pressable>;
            })}
          </ScrollView>
          <View style={styles.listDivider} />
          {loading && !loans.length ? <View style={styles.emptyState}><ActivityIndicator color={colors.primary} /><Text style={styles.emptyTitle}>Loading entries…</Text></View> : filteredLoans.length ? (
            <View style={styles.loanList}>{filteredLoans.map((loan) => <LoanCard key={`${loan.id}-${loan.status}`} loan={loan} onRepay={handleRepay} busy={busyLoanId === loan.id} />)}</View>
          ) : (
            <View style={styles.emptyState}><View style={styles.emptyIcon}><Text style={styles.emptyIconText}>{activeFilter === 'OVERDUE' ? '✓' : '↗'}</Text></View><Text style={styles.emptyTitle}>{searchTerm ? 'No matching entries' : activeFilter === 'OVERDUE' ? 'Nothing overdue. Nice.' : activeFilter === 'REPAID' ? 'No settled entries yet' : activeFilter === 'PENDING' ? 'All caught up' : 'Start with your first loan'}</Text><Text style={styles.emptySubtitle}>{searchTerm ? 'Try another friend name or clear your search.' : activeFilter === 'OVERDUE' ? 'You have no pending loans past their due date.' : activeFilter === 'REPAID' ? 'Loans you mark as repaid will appear here.' : activeFilter === 'PENDING' ? 'You have no active loans to follow up on.' : 'Add a loan to remember who owes what and when it is due.'}</Text>{activeFilter === 'ALL' && !loans.length && !loading ? <Button title="Add your first loan" onPress={() => setAdding(true)} style={styles.emptyAction} /> : null}</View>
          )}
          <View style={styles.listFoot}><Text style={styles.listFootText}>Showing {filteredLoans.length} of {loans.length} entries</Text><Text style={styles.privateMark}>● PRIVATE TO YOUR ACCOUNT</Text></View>
        </Surface>

        <View style={styles.footer}><View style={styles.footerBrand}><BrandMark size={25} /><Text style={styles.footerBrandName}>MiniLedger</Text></View><Text style={styles.footerText}>A little clarity goes a long way.</Text><Text style={styles.footerVersion}>DEMO · v1.0.0</Text></View>
      </ScrollView>
      <AddLoanModal visible={adding} onClose={() => setAdding(false)} onSave={handleAdd} />
    </View>
  );
}

function SummaryCard({ label, value, icon, note, tone, wide }: { label: string; value: number; icon: string; note: string; tone: 'primary' | 'green' | 'red' | 'amber'; wide: boolean }) {
  const palette = {
    primary: { color: colors.primary, soft: colors.primarySoft, stripe: colors.primary },
    green: { color: colors.green, soft: colors.greenSoft, stripe: colors.green },
    red: { color: colors.red, soft: colors.redSoft, stripe: colors.red },
    amber: { color: colors.amber, soft: colors.amberSoft, stripe: '#D48A21' }
  }[tone];
  return <Surface style={[styles.summaryCard, wide ? styles.summaryCardWide : styles.summaryCardNarrow]}><View style={[styles.statStripe, { backgroundColor: palette.stripe }]} /><View style={styles.statTop}><Text style={styles.statLabel}>{label}</Text><View style={[styles.statIcon, { backgroundColor: palette.soft }]}><Text style={[styles.statIconText, { color: palette.color }]}>{icon}</Text></View></View><Text adjustsFontSizeToFit numberOfLines={1} minimumFontScale={0.76} style={[styles.statValue, tone === 'red' && value > 0 && { color: colors.red }]}>{formatCurrency(value)}</Text><View style={styles.statFoot}><View style={[styles.statDot, { backgroundColor: palette.stripe }]} /><Text style={styles.statNote}>{note}</Text></View></Surface>;
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.background },
  content: { flexGrow: 1, padding: 17, gap: 25, width: '100%', maxWidth: 1180, alignSelf: 'center', paddingBottom: 34 },
  contentWide: { paddingHorizontal: 30, paddingTop: 25, gap: 27 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 14 },
  brandLine: { flexDirection: 'row', alignItems: 'center', gap: 11 },
  brandName: { color: colors.ink, fontSize: 19, fontWeight: '900', letterSpacing: -0.45 },
  brandTagline: { color: colors.inkSecondary, fontSize: 11, marginTop: 3 },
  headerActions: { flexDirection: 'row', alignItems: 'center', gap: 9, flexWrap: 'wrap' },
  accountPill: { flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 100, paddingHorizontal: 12, paddingVertical: 9, backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.border, maxWidth: 210 },
  accountDot: { width: 7, height: 7, borderRadius: 4, backgroundColor: colors.green },
  accountPhone: { color: colors.inkSecondary, fontSize: 11, fontWeight: '800' },
  signOutButton: { minHeight: 39, paddingHorizontal: 13, borderRadius: 12 },
  welcomePanel: { backgroundColor: '#292D78', borderRadius: 25, minHeight: 164, padding: 23, overflow: 'hidden', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  welcomePanelWide: { paddingHorizontal: 30, minHeight: 180 },
  welcomePanelNarrow: { flexDirection: 'column', alignItems: 'flex-start', justifyContent: 'center', minHeight: 210, padding: 22, gap: 17 },
  welcomeCopy: { flex: 1, gap: 8, zIndex: 1 },
  welcomeCopyNarrow: { width: '100%' },
  welcomeEyebrow: { color: '#C7CEFF', fontSize: 9, fontWeight: '900', letterSpacing: 1.55 },
  welcomeTitle: { color: '#FFFFFF', fontSize: 25, fontWeight: '900', letterSpacing: -0.75, maxWidth: 540, lineHeight: 31 },
  welcomeSubtitle: { color: '#DEE2FF', fontSize: 12, lineHeight: 19, maxWidth: 540 },
  addButton: { backgroundColor: '#127887', zIndex: 1, minHeight: 47, paddingHorizontal: 17 },
  welcomeCircleOne: { position: 'absolute', width: 270, height: 270, borderRadius: 135, borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', right: -108, top: -130 },
  welcomeCircleTwo: { position: 'absolute', width: 195, height: 195, borderRadius: 98, backgroundColor: 'rgba(255,255,255,0.045)', right: 100, bottom: -145 },
  sectionHeaderRow: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 15, flexWrap: 'wrap' },
  currencyLabel: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.7, paddingBottom: 3 },
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  summaryCard: { padding: 17, borderRadius: 20, position: 'relative', overflow: 'hidden', gap: 14, borderColor: '#E7EBF4' },
  summaryCardWide: { width: '23.7%', minWidth: 185, flexGrow: 1 },
  summaryCardNarrow: { width: '48%', minWidth: 126, flexGrow: 1, padding: 13 },
  statStripe: { position: 'absolute', top: 0, left: 0, right: 0, height: 4 },
  statTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7 },
  statLabel: { color: colors.inkSecondary, fontSize: 9, fontWeight: '900', letterSpacing: 0.65, flex: 1, lineHeight: 13 },
  statIcon: { width: 34, height: 34, borderRadius: 11, alignItems: 'center', justifyContent: 'center' },
  statIconText: { fontSize: 16, fontWeight: '900' },
  statValue: { color: colors.ink, fontSize: 22, fontWeight: '900', letterSpacing: -0.7, fontVariant: ['tabular-nums'] },
  statFoot: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  statDot: { width: 6, height: 6, borderRadius: 3 },
  statNote: { flex: 1, color: colors.inkSecondary, fontSize: 10, lineHeight: 14 },
  loadingPanel: { backgroundColor: colors.surface, minHeight: 130, borderRadius: 20, borderWidth: 1, borderColor: colors.border, alignItems: 'center', justifyContent: 'center', gap: 10 },
  loadingText: { color: colors.inkSecondary, fontSize: 12, fontWeight: '600' },
  emptySummary: { gap: 11 },
  emptySummaryTitle: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  emptySummaryText: { color: colors.inkSecondary, fontSize: 12, lineHeight: 19 },
  toast: { backgroundColor: colors.greenSoft, borderColor: '#BFEBD8', borderWidth: 1, padding: 14, borderRadius: 15, flexDirection: 'row', alignItems: 'center', gap: 9 },
  toastCheck: { color: colors.green, fontSize: 16, fontWeight: '900' },
  toastText: { flex: 1, color: colors.green, fontWeight: '800', fontSize: 12, lineHeight: 18 },
  dismiss: { color: colors.green, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 },
  listHeader: { flexDirection: 'row', alignItems: 'flex-end', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: -8 },
  newEntryButton: { minHeight: 41, paddingHorizontal: 13, borderRadius: 12 },
  listPanel: { padding: 16, gap: 15, borderRadius: 23 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1, borderColor: '#DDE4EF', backgroundColor: colors.surfaceMuted, minHeight: 48, borderRadius: 14, paddingHorizontal: 13 },
  searchIcon: { fontSize: 23, color: colors.muted, marginTop: -5 },
  searchInput: { flex: 1, color: colors.ink, fontSize: 13, minHeight: 44 },
  filterRow: { gap: 8, flexDirection: 'row', alignItems: 'center', paddingVertical: 2 },
  filterChip: { paddingHorizontal: 11, minHeight: 36, flexDirection: 'row', alignItems: 'center', gap: 7, borderRadius: 12, borderWidth: 1, borderColor: colors.border, backgroundColor: colors.surface },
  filterChipActive: { backgroundColor: colors.primarySoft, borderColor: '#C8D0FF' },
  filterText: { fontSize: 11, fontWeight: '800', color: colors.inkSecondary },
  filterTextActive: { color: colors.primaryDark },
  filterCount: { backgroundColor: colors.background, borderRadius: 7, minWidth: 20, height: 20, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 4 },
  filterCountActive: { backgroundColor: '#DDE2FF' },
  filterCountText: { fontSize: 9, color: colors.inkSecondary, fontWeight: '900' },
  filterCountTextActive: { color: colors.primaryDark },
  listDivider: { height: 1, backgroundColor: colors.border },
  loanList: { gap: 11 },
  emptyState: { alignItems: 'center', paddingVertical: 38, paddingHorizontal: 14, gap: 10 },
  emptyIcon: { width: 50, height: 50, backgroundColor: colors.greenSoft, borderRadius: 17, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  emptyIconText: { fontSize: 22, fontWeight: '900', color: colors.green },
  emptyTitle: { fontSize: 15, fontWeight: '900', color: colors.ink, textAlign: 'center' },
  emptySubtitle: { fontSize: 12, lineHeight: 19, color: colors.inkSecondary, textAlign: 'center', maxWidth: 330 },
  emptyAction: { marginTop: 7 },
  listFoot: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8, paddingTop: 5, flexWrap: 'wrap' },
  listFootText: { color: colors.muted, fontSize: 10 },
  privateMark: { color: colors.muted, fontSize: 8, fontWeight: '900', letterSpacing: 0.75 },
  footer: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 9, paddingTop: 3 },
  footerBrand: { flexDirection: 'row', alignItems: 'center', gap: 7 },
  footerBrandName: { color: colors.ink, fontSize: 12, fontWeight: '900' },
  footerText: { flex: 1, color: colors.inkSecondary, fontSize: 10 },
  footerVersion: { color: colors.muted, fontSize: 9, fontWeight: '900', letterSpacing: 0.7 }
});
