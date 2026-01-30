import { Request, Response } from 'express';
import { Logger } from './policy/logging';

export function eventsHandler(req: Request, res: Response) {
  const { type, payload } = req.body;
  
  // Validate allowed types
  const ALLOWED_TYPES = ['SESSION_START', 'SESSION_END', 'ERROR', 'CONSENT_DENIED'];
  
  if (!ALLOWED_TYPES.includes(type)) {
    return res.status(400).json({ error: 'Invalid event type' });
  }

  Logger.info('Event received', { type, payload }); // Logger scrubs unsafe fields
  res.status(200).json({ received: true });
}
