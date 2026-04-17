import { Context } from 'hono';

// Fallback audio proxy for when the R2 bucket isn't public.
// Route: GET /api/audio/:key (url-encoded)
export const onRequestGet = async (c: Context) => {
  const env = c.env as { AUDIO?: R2Bucket };
  if (!env.AUDIO) return c.text('R2 binding missing', 500);
  const key = decodeURIComponent(c.req.param('key')!);
  const obj = await env.AUDIO.get(key);
  if (!obj) return c.text('Not found', 404);
  return new Response(obj.body, {
    headers: {
      'Content-Type': obj.httpMetadata?.contentType ?? 'audio/ogg',
      'Cache-Control': 'public, max-age=31536000, immutable',
      ETag: obj.etag
    }
  });
};
