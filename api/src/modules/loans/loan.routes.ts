import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { asyncHandler } from '../../utils/asyncHandler';
import { PgLoanRepository } from './loan.repository';
import { LoanController } from './loan.controller';
import { LoanService } from './loan.service';
import { LocalReceiptStorage } from './receiptStorage';
import { receiptUpload } from './uploadMiddleware';

const router = Router();
const controller = new LoanController(new LoanService(new PgLoanRepository(), new LocalReceiptStorage()));
router.use(authenticate);
router.get('/', asyncHandler(controller.list));
router.post('/', receiptUpload.single('receipt'), asyncHandler(controller.create));
router.patch('/:id/repay', asyncHandler(controller.markRepaid));
export { router as loanRoutes };
