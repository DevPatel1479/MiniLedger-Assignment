import { pool } from '../../db/pool';
import type { AuthRepository, OtpChallenge, UserRecord } from './auth.types';

export class PgAuthRepository implements AuthRepository {
  async saveOtpChallenge(challenge: OtpChallenge): Promise<void> {
    await pool.query(
      `INSERT INTO otp_challenges (phone, code_hash, expires_at, attempts)
       VALUES ($1, $2, $3, 0)
       ON CONFLICT (phone) DO UPDATE SET code_hash = EXCLUDED.code_hash, expires_at = EXCLUDED.expires_at, attempts = 0, created_at = NOW()`,
      [challenge.phone, challenge.codeHash, challenge.expiresAt]
    );
  }

  async findOtpChallenge(phone: string): Promise<OtpChallenge | null> {
    const result = await pool.query<{ phone: string; code_hash: string; expires_at: Date; attempts: number }>(
      'SELECT phone, code_hash, expires_at, attempts FROM otp_challenges WHERE phone = $1', [phone]
    );
    const row = result.rows[0];
    return row ? { phone: row.phone, codeHash: row.code_hash, expiresAt: new Date(row.expires_at.getTime()), attempts: row.attempts } : null;
  }

  async incrementOtpAttempts(phone: string): Promise<void> {
    await pool.query('UPDATE otp_challenges SET attempts = attempts + 1 WHERE phone = $1', [phone]);
  }

  async deleteOtpChallenge(phone: string): Promise<void> {
    await pool.query('DELETE FROM otp_challenges WHERE phone = $1', [phone]);
  }

  async upsertUser(phone: string): Promise<UserRecord> {
    const result = await pool.query<{ id: string; phone: string; created_at: Date }>(
      `INSERT INTO users (phone) VALUES ($1)
       ON CONFLICT (phone) DO UPDATE SET phone = EXCLUDED.phone
       RETURNING id, phone, created_at`, [phone]
    );
    const row = result.rows[0];
    if (!row) throw new Error('User upsert returned no record.');
    return { id: row.id, phone: row.phone, createdAt: row.created_at };
  }
}
