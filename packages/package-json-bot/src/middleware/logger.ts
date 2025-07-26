import type { MiddlewareHandler } from 'hono';
import { log } from '../utils/logger';

export function logger(): MiddlewareHandler {
  return async (c, next) => {
    const start = Date.now();
    const requestId = crypto.randomUUID();

    // Set request start time and ID for use in other middlewares
    c.set('startTime', start);
    c.set('requestId', requestId);

    const { method } = c.req;
    const url = new URL(c.req.url);
    const path = url.pathname + url.search;
    const userAgent = c.req.header('user-agent') || 'unknown';

    log(`[${requestId}] ${method} ${path} - ${userAgent}`, 'info');

    await next();

    const responseTime = Date.now() - start;
    log(
      `[${requestId}] ${method} ${path} - ${c.res.status} in ${responseTime}ms`,
      c.res.status >= 500 ? 'error' : c.res.status >= 400 ? 'warn' : 'info'
    );
  };
}

// Log level type
type LogLevel = 'debug' | 'info' | 'warn' | 'error';

// Logger utility
export function log(message: string, level: LogLevel = 'info', meta: Record<string, unknown> = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = {
    timestamp,
    level,
    message,
    ...meta,
  };

  // In production, you might want to use a proper logging service
  if (process.env.NODE_ENV === 'production') {
    // Here you could send logs to a logging service
    console.log(JSON.stringify(logEntry));
  } else {
    // Color-coded console output for development
    const colors = {
      debug: '\x1b[36m', // Cyan
      info: '\x1b[32m', // Green
      warn: '\x1b[33m', // Yellow
      error: '\x1b[31m', // Red
      reset: '\x1b[0m', // Reset
    };

    const color = colors[level] || colors.reset;
    console.log(`${timestamp} ${color}[${level.toUpperCase()}]${colors.reset} ${message}`);

    if (Object.keys(meta).length > 0) {
      console.dir(meta, { depth: null, colors: true });
    }
  }
}
