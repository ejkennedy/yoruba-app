// Manual route loader. You can switch to auto-generated later with:
//   bun run routes
// which invokes hono-router to crawl src/routes/ and rewrite this file.

import { Hono, Env } from 'hono';

import * as index from './routes/index';
import * as login from './routes/auth/login';
import * as signup from './routes/auth/signup';
import * as logout from './routes/auth/logout';
import * as decksIndex from './routes/decks/index';
import * as decksSlug from './routes/decks/[slug]';
import * as decksToggle from './routes/decks/toggle';
import * as studyIndex from './routes/study/index';
import * as studySession from './routes/study/session';
import * as studyGrade from './routes/study/grade';
import * as progress from './routes/progress';
import * as words from './routes/words';
import * as cultureIndex from './routes/culture/index';
import * as cultureSlug from './routes/culture/[slug]';
import * as speakIndex from './routes/speak/index';
import * as speakGrade from './routes/speak/grade';
import * as apiAudio from './routes/api/audio';

type RouteModule = {
  onRequestGet?: (c: any) => any;
  onRequestPost?: (c: any) => any;
};

function mount(app: Hono<any>, path: string, mod: RouteModule) {
  if (mod.onRequestGet) app.get(path, mod.onRequestGet);
  if (mod.onRequestPost) app.post(path, mod.onRequestPost);
}

export const loadRoutes = <T extends Env>(app: Hono<T>) => {
  mount(app as any, '/', index);
  mount(app as any, '/auth/login', login);
  mount(app as any, '/auth/signup', signup);
  mount(app as any, '/auth/logout', logout);

  mount(app as any, '/decks', decksIndex);
  mount(app as any, '/decks/:slug', decksSlug);
  mount(app as any, '/decks/:slug/toggle', decksToggle);

  mount(app as any, '/study', studyIndex);
  mount(app as any, '/study/session', studySession);
  mount(app as any, '/study/grade', studyGrade);

  mount(app as any, '/progress', progress);
  mount(app as any, '/words', words);

  mount(app as any, '/culture', cultureIndex);
  mount(app as any, '/culture/:slug', cultureSlug);

  mount(app as any, '/speak', speakIndex);
  mount(app as any, '/speak/grade', speakGrade);

  mount(app as any, '/api/audio/:key', apiAudio);
};
