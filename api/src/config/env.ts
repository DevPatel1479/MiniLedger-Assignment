import path from 'node:path';
import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1).default('postgres://miniledger:miniledger_dev_password@localhost:5432/miniledger'),
  JWT_SECRET: z.string().min(32).default('local-development-jwt-secret-change-this-now'),
  OTP_SECRET: z.string().min(32).default('local-development-otp-secret-change-this-now'),
  JWT_EXPIRES_IN: z.string().default('7d'),
  OTP_TTL_SECONDS: z.coerce.number().int().min(60).max(900).default(300),
  OTP_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(10).default(5),
  UPLOAD_DIR: z.string().default('./uploads'),
  MAX_RECEIPT_BYTES: z.coerce.number().int().min(1024).max(20971520).default(5242880),
  CORS_ORIGIN: z.string().default('http://localhost:8081,http://localhost:19006')
});

const result = envSchema.safeParse(process.env);
if (!result.success) {
  throw new Error(`Invalid environment configuration: ${result.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`).join('; ')}`);
}

const isPlaceholderSecret = (secret: string) => /^(local-development|replace-with|change-me|your-secret)/i.test(secret);
if (result.data.NODE_ENV === 'production' && (isPlaceholderSecret(result.data.JWT_SECRET) || isPlaceholderSecret(result.data.OTP_SECRET))) {
  throw new Error('JWT_SECRET and OTP_SECRET must be replaced in production.');
}

export const env = {
  ...result.data,
  uploadDirAbsolute: path.resolve(process.cwd(), result.data.UPLOAD_DIR),
  corsOrigins: result.data.CORS_ORIGIN.split(',').map((origin) => origin.trim()).filter(Boolean)
};
