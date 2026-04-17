import { Hono } from 'hono';
import { loadRoutes } from './router';
import { loadMiddleware } from './middleware';

const app = new Hono<{ Bindings: CloudflareBindings }>();

loadMiddleware(app);
loadRoutes(app);

export default {
  fetch: app.fetch
};
