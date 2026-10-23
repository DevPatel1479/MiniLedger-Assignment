import { z } from 'zod';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Due date must use YYYY-MM-DD format.').refine((value) => {
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}, 'Enter a valid calendar date.');

export const createLoanSchema = z.object({
  friendName: z.string().trim().min(1, 'Friend name is required.').max(80, 'Friend name must be 80 characters or fewer.'),
  amount: z.coerce.number().finite().positive('Amount must be greater than zero.').max(9_999_999_999.99, 'Amount is too large.').refine((value) => Math.abs(value * 100 - Math.round(value * 100)) < 0.00001, 'Amount can have at most 2 decimal places.'),
  dueDate: isoDate
});

export type CreateLoanInput = z.infer<typeof createLoanSchema>;
