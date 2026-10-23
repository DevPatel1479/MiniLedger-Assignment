import { Router } from 'express';
import { asyncHandler } from '../../utils/asyncHandler';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PgAuthRepository } from './auth.repository';

const router = Router();
const controller = new AuthController(new AuthService(new PgAuthRepository()));
router.post('/request-otp', asyncHandler(controller.requestOtp));
router.post('/verify-otp', asyncHandler(controller.verifyOtp));
export { router as authRoutes };
