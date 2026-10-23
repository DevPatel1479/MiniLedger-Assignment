export interface Session {
  token: string;
  phone: string;
}

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

export interface Summary {
  totalLent: number;
  totalRepaid: number;
  overdueAmount: number;
  pendingCount: number;
  repaidCount: number;
}

export interface AuthResult {
  token: string;
  user: { id: string; phone: string; createdAt?: string };
}
