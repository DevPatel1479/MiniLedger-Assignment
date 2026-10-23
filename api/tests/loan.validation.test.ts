import { describe, expect, it } from 'vitest';
import { createLoanSchema } from '../src/modules/loans/loan.validation';
import { phoneSchema } from '../src/modules/auth/auth.validation';

describe('input schemas', () => {
  it('accepts a valid international phone number', () => {
    expect(phoneSchema.parse('+919876543210')).toBe('+919876543210');
  });
  it('accepts an amount with two decimal places', () => {
    expect(createLoanSchema.parse({ friendName: 'Mira', amount: '125.50', dueDate: '2026-11-01' }).amount).toBe(125.5);
  });
  it('rejects excessive friend name length', () => {
    expect(() => createLoanSchema.parse({ friendName: 'x'.repeat(81), amount: '1', dueDate: '2026-11-01' })).toThrow();
  });
});
