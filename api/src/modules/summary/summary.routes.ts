import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import { asyncHandler } from '../../utils/asyncHandler';
import { PgLoanRepository } from '../loans/loan.repository';
import { SummaryController } from './summary.controller';
import { SummaryService } from './summary.service';

const router = Router();
const controller = new SummaryController(new SummaryService(new PgLoanRepository()));
router.use(authenticate);
router.get('/', asyncHandler(controller.get));
export { router as summaryRoutes };
