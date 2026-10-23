import type { RequestHandler } from 'express';
import { HttpError } from '../../utils/httpError';
import { LoanService } from './loan.service';
import type { ReceiptFile } from './receiptStorage';

export class LoanController {
  constructor(private readonly service: LoanService) {}

  list: RequestHandler = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) throw new HttpError(401, 'Please sign in to continue.', 'AUTH_REQUIRED');
    const loans = await this.service.list(userId);
    res.status(200).json({ data: loans });
  };

  create: RequestHandler = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) throw new HttpError(401, 'Please sign in to continue.', 'AUTH_REQUIRED');
    const receipt = req.file as ReceiptFile | undefined;
    const loan = await this.service.create(userId, req.body, receipt);
    res.status(201).json({ data: loan });
  };

  markRepaid: RequestHandler = async (req, res) => {
    const userId = req.user?.id;
    if (!userId) throw new HttpError(401, 'Please sign in to continue.', 'AUTH_REQUIRED');
    const rawLoanId = req.params.id;
    const loanId = Array.isArray(rawLoanId) ? rawLoanId[0] : rawLoanId;
    if (!loanId) throw new HttpError(400, 'Loan ID is required.', 'INVALID_LOAN_ID');
    const loan = await this.service.markRepaid(userId, loanId);
    res.status(200).json({ data: loan });
  };
}
