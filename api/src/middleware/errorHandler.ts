import type { ErrorRequestHandler } from 'express';
import multer from 'multer';
import { ZodError } from 'zod';
import { HttpError } from '../utils/httpError';
import { env } from '../config/env';

export const errorHandler: ErrorRequestHandler = (error: unknown, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ error: { code: 'VALIDATION_ERROR', message: 'Please check the submitted fields.', details: error.issues.map((issue) => ({ field: issue.path.join('.'), message: issue.message })) } });
    return;
  }

  if (error instanceof multer.MulterError) {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400;
    res.status(status).json({ error: { code: error.code, message: error.code === 'LIMIT_FILE_SIZE' ? `Receipt must be no larger than ${Math.floor(env.MAX_RECEIPT_BYTES / 1024 / 1024)} MB.` : error.message } });
    return;
  }

  if (error instanceof HttpError) {
    res.status(error.statusCode).json({ error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) } });
    return;
  }

  const maybeError = error as { status?: number; message?: string } | null;
  if (maybeError?.status === 400 && maybeError.message?.toLowerCase().includes('multipart')) {
    res.status(400).json({ error: { code: 'INVALID_MULTIPART', message: 'The receipt upload could not be parsed. Please try selecting the image again.' } });
    return;
  }

  console.error('Unhandled request error:', error);
  res.status(500).json({ error: { code: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong. Please try again.' } });
};
