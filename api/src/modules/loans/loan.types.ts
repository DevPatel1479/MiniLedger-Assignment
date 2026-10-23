export type LoanStatus = 'PENDING' | 'REPAID';

export interface Loan {
  id: string;
  userId: string;
  friendName: string;
  amount: number;
  dueDate: string;
  status: LoanStatus;
  receiptPath: string | null;
  createdAt: string;
  repaidAt: string | null;
}

export interface CreateLoanRecord {
  userId: string;
  friendName: string;
  amount: number;
  dueDate: string;
  receiptPath: string | null;
}

export interface LoanSummary {
  totalLent: number;
  totalRepaid: number;
  overdueAmount: number;
  pendingCount: number;
  repaidCount: number;
}

export interface LoanRepository {
  create(input: CreateLoanRecord): Promise<Loan>;
  listByUser(userId: string): Promise<Loan[]>;
  findById(userId: string, loanId: string): Promise<Loan | null>;
  markRepaid(userId: string, loanId: string): Promise<Loan | null>;
  getSummary(userId: string): Promise<LoanSummary>;
}
