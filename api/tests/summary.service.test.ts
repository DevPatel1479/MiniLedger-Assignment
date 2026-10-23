import { describe, expect, it, vi } from 'vitest';
import { SummaryService } from '../src/modules/summary/summary.service';

describe('SummaryService', () => {
  it('returns summary values for the signed-in user without modifying totals', async () => {
    const expected = { totalLent: 1200, totalRepaid: 300, overdueAmount: 200, pendingCount: 3, repaidCount: 1 };
    const repository = { getSummary: vi.fn().mockResolvedValue(expected) };
    const service = new SummaryService(repository);
    await expect(service.getForUser('user-1')).resolves.toEqual(expected);
    expect(repository.getSummary).toHaveBeenCalledWith('user-1');
  });
});
