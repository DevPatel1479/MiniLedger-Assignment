import type { LoanRepository, LoanSummary } from '../loans/loan.types';

export class SummaryService {
  constructor(private readonly repository: Pick<LoanRepository, 'getSummary'>) {}

  getForUser(userId: string): Promise<LoanSummary> {
    return this.repository.getSummary(userId);
  }
}
