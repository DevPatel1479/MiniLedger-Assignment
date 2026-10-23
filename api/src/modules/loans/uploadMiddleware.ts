import multer from 'multer';
import { env } from '../../config/env';
import { HttpError } from '../../utils/httpError';

export const receiptUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: env.MAX_RECEIPT_BYTES, files: 1, fields: 8, parts: 10 },
  fileFilter: (_req, file, callback) => {
    const allowed = new Set(['image/jpeg', 'image/png', 'image/webp']);
    if (!allowed.has(file.mimetype)) {
      callback(new HttpError(400, 'Receipt must be a JPEG, PNG, or WebP image.', 'INVALID_RECEIPT_TYPE'));
      return;
    }
    callback(null, true);
  }
});
