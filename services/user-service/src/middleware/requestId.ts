import type { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

export function requestId(_req: Request, res: Response, next: NextFunction): void {
  res.locals['requestId'] = randomUUID();
  next();
}
