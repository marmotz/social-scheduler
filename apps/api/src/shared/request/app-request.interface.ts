import type { PublicUser } from '@sonskay/shared';
import type { Request } from 'express';
import type { DateTime } from 'luxon';

export interface AppRequest extends Request {
  clientIp: string | null;
  sessionId?: string;
  user?: PublicUser;
  requestId: string;
  timestamp: DateTime;
  noLog?: boolean;
}
