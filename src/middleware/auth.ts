import { Context, Next } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { eq, and, gt, lt } from 'drizzle-orm';
import { getDb } from '@/db';
import { users, sessions } from '@/db/schema';

const SESSION_COOKIE_NAME = 'yoruba_session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
}

export interface AuthContext {
  user?: AuthUser;
  session?: { id: string; expiresAt: Date };
}

declare module 'hono' {
  interface ContextVariableMap {
    auth: AuthContext;
    db: ReturnType<typeof getDb>;
  }
}

export const dbMiddleware = async (c: Context, next: Next) => {
  c.set('db', getDb(c.env.DB));
  await next();
};

export const authMiddleware = async (c: Context, next: Next) => {
  const db = c.get('db');
  const sessionId = getCookie(c, SESSION_COOKIE_NAME);
  const authContext: AuthContext = {};

  if (sessionId) {
    try {
      const result = await db
        .select({ session: sessions, user: users })
        .from(sessions)
        .innerJoin(users, eq(sessions.userId, users.id))
        .where(and(eq(sessions.id, sessionId), gt(sessions.expiresAt, new Date())))
        .get();

      if (result) {
        authContext.user = {
          id: result.user.id,
          email: result.user.email,
          displayName: result.user.displayName
        };
        authContext.session = { id: result.session.id, expiresAt: result.session.expiresAt };
      } else {
        deleteCookie(c, SESSION_COOKIE_NAME);
      }
    } catch (err) {
      console.error('Auth middleware error:', err);
      deleteCookie(c, SESSION_COOKIE_NAME);
    }
  }

  c.set('auth', authContext);
  await next();
};

export const requireAuth = async (c: Context, next: Next) => {
  const auth = c.get('auth');
  if (!auth.user) {
    if (c.req.header('HX-Request')) {
      return c.text('Unauthorized', 401, { 'HX-Redirect': '/auth/login' });
    }
    return c.redirect('/auth/login');
  }
  await next();
};

export async function createSession(c: Context, userId: string): Promise<string> {
  const db = c.get('db');
  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE * 1000);

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    data: JSON.stringify({}),
    expiresAt
  });

  setCookie(c, SESSION_COOKIE_NAME, sessionId, {
    httpOnly: true,
    secure: true,
    sameSite: 'Lax',
    maxAge: SESSION_MAX_AGE,
    path: '/'
  });

  return sessionId;
}

export async function destroySession(c: Context) {
  const sessionId = getCookie(c, SESSION_COOKIE_NAME);
  if (sessionId) {
    const db = c.get('db');
    await db.delete(sessions).where(eq(sessions.id, sessionId));
  }
  deleteCookie(c, SESSION_COOKIE_NAME);
}

// SHA-256 salted hash using Web Crypto (Cloudflare Workers runtime)
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const saltHex = Array.from(salt)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  const data = new TextEncoder().encode(saltHex + password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return saltHex + ':' + hashHex;
}

export async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  try {
    const [salt, hash] = storedHash.split(':');
    if (!salt || !hash) return false;
    const data = new TextEncoder().encode(salt + password);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashHex = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
    // Constant-time compare
    if (hashHex.length !== hash.length) return false;
    let diff = 0;
    for (let i = 0; i < hashHex.length; i++) diff |= hashHex.charCodeAt(i) ^ hash.charCodeAt(i);
    return diff === 0;
  } catch {
    return false;
  }
}

export async function cleanupSessions(db: ReturnType<typeof getDb>) {
  await db.delete(sessions).where(lt(sessions.expiresAt, new Date()));
}
