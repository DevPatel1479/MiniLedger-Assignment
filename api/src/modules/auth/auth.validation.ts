import { z } from 'zod';

export const phoneSchema = z.string().trim().regex(/^\+?[1-9]\d{9,14}$/, 'Enter a valid phone number with 10–15 digits.');
export const requestOtpSchema = z.object({ phone: phoneSchema });
export const verifyOtpSchema = z.object({ phone: phoneSchema, otp: z.string().trim().regex(/^\d{6}$/, 'OTP must contain exactly 6 digits.') });

export type RequestOtpInput = z.infer<typeof requestOtpSchema>;
export type VerifyOtpInput = z.infer<typeof verifyOtpSchema>;
