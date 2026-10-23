import type { RequestHandler } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';
import type { AuthenticatedUser } from '../modules/auth/auth.types';
import { HttpError } from '../utils/httpError';

export const authenticate: RequestHandler = (req, _res, next) => {
  const authorization = req.header('authorization');
  if (!authorization?.startsWith('Bearer ')) {
    next(new HttpError(401, 'Please sign in to continue.', 'AUTH_REQUIRED'));
    return;
  }

  try {
    const payload = jwt.verify(authorization.slice(7), env.JWT_SECRET) as jwt.JwtPayload;
    if (typeof payload.sub !== 'string' || typeof payload.phone !== 'string') {
      throw new Error('Invalid token payload');
    }
    const user: AuthenticatedUser = { id: payload.sub, phone: payload.phone };
    req.user = user;
    next();
  } catch {
    next(new HttpError(401, 'Your session is invalid or has expired. Please sign in again.', 'INVALID_TOKEN'));
  }
};
