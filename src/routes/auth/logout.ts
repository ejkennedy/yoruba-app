import { Context } from 'hono';
import { destroySession } from '@/middleware/auth';

export const onRequestPost = async (c: Context) => {
  await destroySession(c);
  if (c.req.header('HX-Request')) return c.html('', 200, { 'HX-Redirect': '/' });
  return c.redirect('/');
};

export const onRequestGet = onRequestPost;
