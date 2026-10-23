import { describe, expect, it, vi } from 'vitest';
import { LoanService } from '../src/modules/loans/loan.service';
import type { CreateLoanRecord, Loan, LoanRepository, LoanSummary } from '../src/modules/loans/loan.types';
import type { ReceiptFile, ReceiptStorage } from '../src/modules/loans/receiptStorage';

const sampleLoan: Loan = {
  id: 'loan-1', userId: 'user-1', friendName: 'Aarav', amount: 500, dueDate: '2026-10-30',
  status: 'PENDING', receiptPath: null, createdAt: '2026-10-22T10:00:00.000Z', repaidAt: null
};

class FakeLoanRepository implements LoanRepository {
  loans: Loan[] = [sampleLoan];
  create = vi.fn(async (input: CreateLoanRecord): Promise<Loan> => {
    const loan = { ...sampleLoan, ...input, id: 'loan-created' };
    this.loans.push(loan);
    return loan;
  });
  async listByUser(userId: string) { return this.loans.filter((loan) => loan.userId === userId); }
  async findById(userId: string, loanId: string) { return this.loans.find((loan) => loan.userId === userId && loan.id === loanId) ?? null; }
  async markRepaid(userId: string, loanId: string) {
    const loan = this.loans.find((item) => item.userId === userId && item.id === loanId && item.status === 'PENDING');
    if (!loan) return null;
    loan.status = 'REPAID'; loan.repaidAt = '2026-10-22T10:00:00.000Z'; return loan;
  }
  async getSummary(): Promise<LoanSummary> { return { totalLent: 500, totalRepaid: 0, overdueAmount: 0, pendingCount: 1, repaidCount: 0 }; }
}

class FakeStorage implements ReceiptStorage {
  save = vi.fn(async (_file: ReceiptFile) => '/uploads/test-receipt.png');
  remove = vi.fn(async (_publicPath: string) => undefined);
}

const validInput = { friendName: ' Aarav ', amount: '500.00', dueDate: '2026-10-30' };
describe('LoanService', () => {
  it('creates validated loans and trims the friend name', async () => {
    const repository = new FakeLoanRepository();
    const service = new LoanService(repository, new FakeStorage());
    const result = await service.create('user-2', validInput);
    expect(result.friendName).toBe('Aarav');
    expect(repository.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'user-2', friendName: 'Aarav', amount: 500, receiptPath: null }));
  });

  it.each([
    [{ friendName: '', amount: '50', dueDate: '2026-10-30' }, 'name'],
    [{ friendName: 'Aarav', amount: '0', dueDate: '2026-10-30' }, 'amount'],
    [{ friendName: 'Aarav', amount: '10.999', dueDate: '2026-10-30' }, 'precision'],
    [{ friendName: 'Aarav', amount: '50', dueDate: '2026-02-30' }, 'date']
  ])('rejects invalid input (%s)', async (input) => {
    const repository = new FakeLoanRepository();
    const service = new LoanService(repository, new FakeStorage());
    await expect(service.create('user-1', input)).rejects.toMatchObject({ issues: expect.any(Array) });
    expect(repository.create).not.toHaveBeenCalled();
  });

  it('stores a receipt and removes it if the database insert fails', async () => {
    const repository = new FakeLoanRepository();
    repository.create.mockRejectedValueOnce(new Error('database offline'));
    const storage = new FakeStorage();
    const service = new LoanService(repository, storage);
    const receipt: ReceiptFile = { buffer: Buffer.from('image'), mimetype: 'image/png', originalname: 'receipt.png', size: 5 };
    await expect(service.create('user-1', validInput, receipt)).rejects.toThrow('database offline');
    expect(storage.save).toHaveBeenCalledWith(receipt);
    expect(storage.remove).toHaveBeenCalledWith('/uploads/test-receipt.png');
  });

  it('marks a pending loan as repaid', async () => {
    const repository = new FakeLoanRepository();
    const service = new LoanService(repository, new FakeStorage());
    const result = await service.markRepaid('user-1', 'loan-1');
    expect(result.status).toBe('REPAID');
  });

  it('does not allow the same loan to be repaid twice', async () => {
    const repository = new FakeLoanRepository();
    repository.loans[0]!.status = 'REPAID';
    const service = new LoanService(repository, new FakeStorage());
    await expect(service.markRepaid('user-1', 'loan-1')).rejects.toMatchObject({ code: 'ALREADY_REPAID' });
  });

  it('does not expose another user’s loan', async () => {
    const service = new LoanService(new FakeLoanRepository(), new FakeStorage());
    await expect(service.markRepaid('someone-else', 'loan-1')).rejects.toMatchObject({ code: 'LOAN_NOT_FOUND' });
  });
});
