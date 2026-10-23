import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { HttpError } from '../../utils/httpError';
import { phoneSchema } from './auth.validation';
import type { AuthRepository, UserRecord } from './auth.types';

export interface AuthServiceOptions {
  now?: () => Date;
  generateOtp?: () => string;
  logOtp?: (phone: string, otp: string) => void;
}

export class AuthService {
  private readonly now: () => Date;
  private readonly generateOtp: () => string;
  private readonly logOtp: (phone: string, otp: string) => void;

  constructor(private readonly repository: AuthRepository, options: AuthServiceOptions = {}) {
    this.now = options.now ?? (() => new Date());
    this.generateOtp = options.generateOtp ?? (() => String(randomInt(100000, 1_000_000)));
    this.logOtp = options.logOtp ?? ((phone, otp) => console.info(`[MiniLedger mock OTP] phone=${phone} otp=${otp}`));
  }

  async requestOtp(rawPhone: string): Promise<{ expiresInSeconds: number }> {
    const phone = phoneSchema.parse(rawPhone);
    const otp = this.generateOtp();
    const expiresAt = new Date(this.now().getTime() + env.OTP_TTL_SECONDS * 1000);
    await this.repository.saveOtpChallenge({ phone, codeHash: this.hashOtp(otp), expiresAt, attempts: 0 });
    this.logOtp(phone, otp);
    return { expiresInSeconds: env.OTP_TTL_SECONDS };
  }

  async verifyOtp(rawPhone: string, otp: string): Promise<{ token: string; user: UserRecord }> {
    const phone = phoneSchema.parse(rawPhone);
    if (!/^\d{6}$/.test(otp)) throw new HttpError(400, 'OTP must contain exactly 6 digits.', 'INVALID_OTP_FORMAT');

    const challenge = await this.repository.findOtpChallenge(phone);
    if (!challenge) throw new HttpError(401, 'Request a new OTP to sign in.', 'OTP_NOT_FOUND');
    if (challenge.expiresAt.getTime() <= this.now().getTime()) {
      await this.repository.deleteOtpChallenge(phone);
      throw new HttpError(401, 'This OTP has expired. Request a new one.', 'OTP_EXPIRED');
    }
    if (challenge.attempts >= env.OTP_MAX_ATTEMPTS) {
      await this.repository.deleteOtpChallenge(phone);
      throw new HttpError(429, 'Too many incorrect attempts. Request a new OTP.', 'OTP_ATTEMPTS_EXCEEDED');
    }

    const submittedHash = Buffer.from(this.hashOtp(otp), 'hex');
    const expectedHash = Buffer.from(challenge.codeHash, 'hex');
    const matches = submittedHash.length === expectedHash.length && timingSafeEqual(submittedHash, expectedHash);
    if (!matches) {
      await this.repository.incrementOtpAttempts(phone);
      throw new HttpError(401, 'Incorrect OTP. Check the server log and try again.', 'OTP_INVALID');
    }

    await this.repository.deleteOtpChallenge(phone);
    const user = await this.repository.upsertUser(phone);
    const token = jwt.sign({ phone: user.phone }, env.JWT_SECRET, { subject: user.id, expiresIn: env.JWT_EXPIRES_IN as jwt.SignOptions['expiresIn'] });
    return { token, user };
  }

  private hashOtp(otp: string): string {
    return createHmac('sha256', env.OTP_SECRET).update(otp).digest('hex');
  }
}
