import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { env } from '../../config/env';
import { HttpError } from '../../utils/httpError';

export interface ReceiptFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
  size: number;
}

export interface ReceiptStorage {
  save(file: ReceiptFile): Promise<string>;
  remove(publicPath: string): Promise<void>;
}

function detectImageExtension(buffer: Buffer): { extension: string; mimeType: string } | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return { extension: '.jpg', mimeType: 'image/jpeg' };
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) return { extension: '.png', mimeType: 'image/png' };
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return { extension: '.webp', mimeType: 'image/webp' };
  return null;
}

export class LocalReceiptStorage implements ReceiptStorage {
  async save(file: ReceiptFile): Promise<string> {
    const detected = detectImageExtension(file.buffer);
    if (!detected || detected.mimeType !== file.mimetype) {
      throw new HttpError(400, 'Receipt must be a valid JPEG, PNG, or WebP image.', 'INVALID_RECEIPT');
    }
    await fs.mkdir(env.uploadDirAbsolute, { recursive: true });
    const filename = `${randomUUID()}${detected.extension}`;
    await fs.writeFile(path.join(env.uploadDirAbsolute, filename), file.buffer, { flag: 'wx' });
    return `/uploads/${filename}`;
  }

  async remove(publicPath: string): Promise<void> {
    const prefix = '/uploads/';
    if (!publicPath.startsWith(prefix)) return;
    const filename = publicPath.slice(prefix.length);
    if (!/^[0-9a-f-]{36}\.(jpg|png|webp)$/.test(filename)) return;
    try {
      await fs.unlink(path.join(env.uploadDirAbsolute, filename));
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error;
    }
  }
}
