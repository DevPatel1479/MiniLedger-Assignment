import type { RequestHandler } from 'express';
import { AuthService } from './auth.service';
import { requestOtpSchema, verifyOtpSchema } from './auth.validation';

export class AuthController {
  constructor(private readonly service: AuthService) {}

  requestOtp: RequestHandler = async (req, res) => {
    const input = requestOtpSchema.parse(req.body);
    const result = await this.service.requestOtp(input.phone);
    res.status(200).json({ message: 'OTP generated. For this demo, check the API server terminal.', data: result });
  };

  verifyOtp: RequestHandler = async (req, res) => {
    const input = verifyOtpSchema.parse(req.body);
    const result = await this.service.verifyOtp(input.phone, input.otp);
    res.status(200).json({ data: result });
  };
}
