import { describe, expect, it } from 'vitest';
import { formatCurrency, formatDate, getLoanDisplayStatus, initials, localIsoDate, validateLoanDraft } from './loanHelpers';

describe('loan helpers', () => {
  it('flags overdue, due-today, upcoming, and repaid loans', () => {
    expect(getLoanDisplayStatus({ status: 'PENDING', dueDate: '2026-10-21' }, '2026-10-22')).toBe('OVERDUE');
    expect(getLoanDisplayStatus({ status: 'PENDING', dueDate: '2026-10-22' }, '2026-10-22')).toBe('DUE_TODAY');
    expect(getLoanDisplayStatus({ status: 'PENDING', dueDate: '2026-10-23' }, '2026-10-22')).toBe('UPCOMING');
    expect(getLoanDisplayStatus({ status: 'REPAID', dueDate: '2026-10-01' }, '2026-10-22')).toBe('REPAID');
  });
  it('formats rupee amounts', () => expect(formatCurrency(1250)).toContain('1,250'));
  it('formats date values without UTC date shifting', () => expect(formatDate('2026-10-22')).toMatch(/22/));
  it('builds initials from first and last words', () => expect(initials('Mira Patel')).toBe('MP'));
  it('produces a local date in ISO order', () => expect(localIsoDate(new Date(2026, 9, 22))).toBe('2026-10-22'));
  it('validates a correct loan draft', () => expect(validateLoanDraft({ friendName: 'Mira', amount: '125.50', dueDate: '2026-11-01' })).toBeNull());
  it.each([
    [{ friendName: '', amount: '5', dueDate: '2026-11-01' }, 'name'],
    [{ friendName: 'Mira', amount: '0', dueDate: '2026-11-01' }, 'amount'],
    [{ friendName: 'Mira', amount: '10.999', dueDate: '2026-11-01' }, 'decimal precision'],
    [{ friendName: 'Mira', amount: '5', dueDate: '2026-02-30' }, 'invalid date']
  ])('rejects invalid loan data (%s)', (draft) => expect(validateLoanDraft(draft)).not.toBeNull());
});
