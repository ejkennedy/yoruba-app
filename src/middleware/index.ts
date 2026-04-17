import { Hono, Env } from 'hono';
import { dbMiddleware, authMiddleware, requireAuth } from './auth';
import { BaseLayout } from '../layouts/BaseLayout';

export { dbMiddleware, authMiddleware, requireAuth };

export const loadMiddleware = <T extends Env>(app: Hono<T>) => {
  // Apply HTML layout to all non-API GETs
  app.get('*', BaseLayout);
  app.use('*', dbMiddleware);
  app.use('*', authMiddleware);

  // Gate all app areas behind auth (auth routes + index are public)
  app.use('/study/*', requireAuth);
  app.use('/speak/*', requireAuth);
  app.use('/decks/*', requireAuth);
  app.use('/progress/*', requireAuth);
  app.use('/progress', requireAuth);
  app.use('/words', requireAuth);
  app.use('/culture/*', requireAuth);
  app.use('/api/*', requireAuth);
};
