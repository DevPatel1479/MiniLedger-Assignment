import { describe, expect, it } from 'vitest';
import { LocalReceiptStorage } from '../src/modules/loans/receiptStorage';

const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

describe('LocalReceiptStorage', () => {
  it('rejects an invalid image payload even if the MIME type claims PNG', async () => {
    const storage = new LocalReceiptStorage();
    await expect(storage.save({ buffer: Buffer.from('not an image'), mimetype: 'image/png', originalname: 'fake.png', size: 12 }))
      .rejects.toMatchObject({ code: 'INVALID_RECEIPT' });
  });

  it('saves an image with a generated public path and can remove it', async () => {
    const storage = new LocalReceiptStorage();
    const publicPath = await storage.save({ buffer: pngHeader, mimetype: 'image/png', originalname: 'my-receipt.png', size: pngHeader.length });
    expect(publicPath).toMatch(/^\/uploads\/[0-9a-f-]{36}\.png$/);
    await expect(storage.remove(publicPath)).resolves.toBeUndefined();
  });
});
