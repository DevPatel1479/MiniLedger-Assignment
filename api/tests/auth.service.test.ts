import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AuthService } from '../src/modules/auth/auth.service';
import type { AuthRepository, OtpChallenge, UserRecord } from '../src/modules/auth/auth.types';

class FakeAuthRepository implements AuthRepository {
  challenge: OtpChallenge | null = null;
  attempts = 0;
  user: UserRecord = { id: 'user-test-id', phone: '+919876543210' };
  async saveOtpChallenge(challenge: OtpChallenge) { this.challenge = { ...challenge }; this.attempts = 0; }
  async findOtpChallenge() { return this.challenge ? { ...this.challenge, attempts: this.attempts } : null; }
  async incrementOtpAttempts() { this.attempts += 1; }
  async deleteOtpChallenge() { this.challenge = null; }
  async upsertUser(phone: string) { this.user = { ...this.user, phone }; return this.user; }
}

const PHONE = '+919876543210';
describe('AuthService', () => {
  let repository: FakeAuthRepository;
  let now: Date;
  let service: AuthService;
  let logOtp: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    repository = new FakeAuthRepository();
    now = new Date('2026-10-22T10:00:00.000Z');
    logOtp = vi.fn();
    service = new AuthService(repository, { now: () => now, generateOtp: () => '123456', logOtp });
  });

  it('stores an expiring challenge and logs the mock OTP on the server', async () => {
    const result = await service.requestOtp(PHONE);
    expect(result.expiresInSeconds).toBeGreaterThan(0);
    expect(repository.challenge?.phone).toBe(PHONE);
    expect(repository.challenge?.codeHash).not.toBe('123456');
    expect(logOtp).toHaveBeenCalledWith(PHONE, '123456');
  });

  it('rejects malformed phone numbers', async () => {
    await expect(service.requestOtp('not-a-phone')).rejects.toMatchObject({ issues: expect.any(Array) });
  });

  it('verifies the OTP, returns a JWT, and consumes the challenge', async () => {
    await service.requestOtp(PHONE);
    const result = await service.verifyOtp(PHONE, '123456');
    expect(result.token.split('.')).toHaveLength(3);
    expect(result.user.phone).toBe(PHONE);
    expect(repository.challenge).toBeNull();
  });

  it('rejects an incorrect OTP and increments attempts', async () => {
    await service.requestOtp(PHONE);
    await expect(service.verifyOtp(PHONE, '654321')).rejects.toMatchObject({ code: 'OTP_INVALID' });
    expect(repository.attempts).toBe(1);
  });

  it('enforces the configured incorrect-attempt limit', async () => {
    await service.requestOtp(PHONE);
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(service.verifyOtp(PHONE, '654321')).rejects.toMatchObject({ code: 'OTP_INVALID' });
    }
    await expect(service.verifyOtp(PHONE, '123456')).rejects.toMatchObject({ code: 'OTP_ATTEMPTS_EXCEEDED' });
    expect(repository.challenge).toBeNull();
  });

  it('expires old challenges', async () => {
    await service.requestOtp(PHONE);
    now = new Date(now.getTime() + 6 * 60 * 1000);
    await expect(service.verifyOtp(PHONE, '123456')).rejects.toMatchObject({ code: 'OTP_EXPIRED' });
    expect(repository.challenge).toBeNull();
  });

  it('rejects invalid OTP format before repository access', async () => {
    await expect(service.verifyOtp(PHONE, '12ab')).rejects.toMatchObject({ code: 'INVALID_OTP_FORMAT' });
  });
});
