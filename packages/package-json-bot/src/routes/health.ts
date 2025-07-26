import { Hono } from 'hono';
import type { Env } from '../types';

// Create a new router for health checks
export const healthRouter = new Hono<{ Bindings: Env }>();

// Basic health check endpoint
healthRouter.get('/', (c) => {
  return c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: c.env.NODE_ENV || 'development',
  });
});

// Detailed health check with dependencies
healthRouter.get('/detailed', async (c) => {
  const checks: Record<string, { status: string; details?: any }> = {
    api: { status: 'ok' },
    database: { status: 'ok' },
    cache: { status: 'ok' },
    storage: { status: 'ok' },
  };

  // Check KV store connection
  try {
    await c.env.KV_CACHE.list();
  } catch (error) {
    checks.cache = {
      status: 'error',
      details: error.message,
    };
  }

  // Check R2 storage connection
  try {
    await c.env.R2_BUCKET.list();
  } catch (error) {
    checks.storage = {
      status: 'error',
      details: error.message,
    };
  }

  // Determine overall status
  const allChecksPassed = Object.values(checks).every((check) => check.status === 'ok');

  return c.json({
    status: allChecksPassed ? 'healthy' : 'degraded',
    timestamp: new Date().toISOString(),
    checks,
    environment: c.env.NODE_ENV || 'development',
    version: '1.0.0',
  });
});

// Version endpoint
healthRouter.get('/version', (c) => {
  return c.json({
    name: 'packagejson-bot',
    version: '1.0.0',
    environment: c.env.NODE_ENV || 'development',
    commit: process.env.GIT_COMMIT_HASH || 'unknown',
    buildDate: process.env.BUILD_DATE || new Date().toISOString(),
  });
});

// Simple ping endpoint for load balancers
healthRouter.get('/ping', (c) => {
  return c.text('pong');
});
