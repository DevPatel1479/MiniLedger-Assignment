import { HttpError } from '../../utils/httpError';
import { createLoanSchema, type CreateLoanInput } from './loan.validation';
import type { Loan, LoanRepository } from './loan.types';
import type { ReceiptFile, ReceiptStorage } from './receiptStorage';

export class LoanService {
  constructor(private readonly repository: LoanRepository, private readonly storage: ReceiptStorage) {}

  async list(userId: string): Promise<Loan[]> {
    return this.repository.listByUser(userId);
  }

  async create(userId: string, rawInput: unknown, receipt?: ReceiptFile): Promise<Loan> {
    const input: CreateLoanInput = createLoanSchema.parse(rawInput);
    let receiptPath: string | null = null;
    if (receipt) receiptPath = await this.storage.save(receipt);

    try {
      return await this.repository.create({ userId, ...input, receiptPath });
    } catch (error) {
      if (receiptPath) {
        await this.storage.remove(receiptPath).catch((cleanupError: unknown) => console.error('Could not clean up orphan receipt:', cleanupError));
      }
      throw error;
    }
  }

  async markRepaid(userId: string, loanId: string): Promise<Loan> {
    const existing = await this.repository.findById(userId, loanId);
    if (!existing) throw new HttpError(404, 'Loan entry was not found.', 'LOAN_NOT_FOUND');
    if (existing.status === 'REPAID') throw new HttpError(409, 'This loan has already been marked as repaid.', 'ALREADY_REPAID');
    const updated = await this.repository.markRepaid(userId, loanId);
    if (!updated) throw new HttpError(409, 'This loan was updated by another request. Refresh and try again.', 'LOAN_UPDATE_CONFLICT');
    return updated;
  }

}
