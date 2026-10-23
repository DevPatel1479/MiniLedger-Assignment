import type { Loan } from '../types';

export type LoanDisplayStatus = 'OVERDUE' | 'DUE_TODAY' | 'UPCOMING' | 'REPAID';

export function localIsoDate(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getLoanDisplayStatus(loan: Pick<Loan, 'status' | 'dueDate'>, today = localIsoDate()): LoanDisplayStatus {
  if (loan.status === 'REPAID') return 'REPAID';
  if (loan.dueDate < today) return 'OVERDUE';
  if (loan.dueDate === today) return 'DUE_TODAY';
  return 'UPCOMING';
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(amount);
}

export function formatDate(value: string): string {
  const [year, month, day] = value.slice(0, 10).split('-').map(Number);
  if (!year || !month || !day) return value;
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(year, month - 1, day));
}

export function initials(name: string): string {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('') || '?';
}

export function validateLoanDraft(input: { friendName: string; amount: string; dueDate: string }): string | null {
  if (!input.friendName.trim()) return 'Enter your friend’s name.';
  if (input.friendName.trim().length > 80) return 'Friend name must be 80 characters or fewer.';
  if (!input.amount.trim()) return 'Enter the amount lent.';
  const amount = Number(input.amount);
  if (!Number.isFinite(amount) || amount <= 0) return 'Amount must be greater than zero.';
  if (!/^\d+(\.\d{1,2})?$/.test(input.amount.trim())) return 'Use at most 2 decimal places for the amount.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(input.dueDate)) return 'Use YYYY-MM-DD for the due date.';
  const date = new Date(`${input.dueDate}T00:00:00.000Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== input.dueDate) return 'Enter a valid calendar date.';
  return null;
}
