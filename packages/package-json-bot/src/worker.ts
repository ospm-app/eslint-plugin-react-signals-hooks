import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from './middleware/logger';
import { errorHandler } from './middleware/error-handler';
import { authMiddleware } from './middleware/auth';
import { analyzeRouter } from './routes/analyze';
import { healthRouter } from './routes/health';
import type { Env } from './types';

// Create the main Hono application
export const app = new Hono<{ Bindings: Env }>()
  // Middleware
  .use('*', logger())
  .use(
    '*',
    cors({
      origin: ['https://packagejsonbot.com', 'http://localhost:3000'],
      allowMethods: ['GET', 'POST', 'OPTIONS'],
      allowHeaders: ['Content-Type', 'Authorization'],
    })
  )
  .use('/api/*', authMiddleware);

// Health check route
app.route('/health', healthRouter);

// API routes
app.route('/api/analyze', analyzeRouter);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Error handling
app.onError(errorHandler);

// Export the worker
export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    return app.fetch(request, env, ctx);
  },
};
