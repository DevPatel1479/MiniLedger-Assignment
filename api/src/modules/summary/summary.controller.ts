import type { RequestHandler } from 'express';
import { HttpError } from '../../utils/httpError';
import { SummaryService } from './summary.service';

export class SummaryController {
  constructor(private readonly service: SummaryService) {}

  get: RequestHandler = async (req, res) => {
    if (!req.user?.id) throw new HttpError(401, 'Please sign in to continue.', 'AUTH_REQUIRED');
    const summary = await this.service.getForUser(req.user.id);
    res.status(200).json({ data: summary });
  };
}
