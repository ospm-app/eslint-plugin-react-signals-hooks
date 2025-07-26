import { HTTPException } from 'hono/http-exception';
import { verify } from 'hono/jwt';
import { log } from '../utils/logger';
import type { MiddlewareHandler } from 'hono';
import type { Env } from '../types';

/**
 * Authentication middleware that verifies JWT tokens
 */
export function authMiddleware(): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const authHeader = c.req.header('Authorization');

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new HTTPException(401, { message: 'Missing or invalid Authorization header' });
    }

    const token = authHeader.split(' ')[1];

    try {
      // Verify the JWT token
      const payload = await verify(token, c.env.JWT_SECRET);

      // Store the user information in the context
      c.set('user', {
        id: payload.sub,
        email: payload.email,
        role: payload.role || 'user',
      });

      log(`Authenticated user: ${payload.email}`, 'debug');
      await next();
    } catch (error) {
      log(`Authentication failed: ${error.message}`, 'warn');
      throw new HTTPException(401, { message: 'Invalid or expired token' });
    }
  };
}

/**
 * Role-based access control middleware
 * @param roles List of allowed roles
 */
export function requireRole(roles: string[]): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const user = c.get('user');

    if (!user) {
      throw new HTTPException(401, { message: 'Authentication required' });
    }

    if (!roles.includes(user.role)) {
      throw new HTTPException(403, {
        message: `Insufficient permissions. Required roles: ${roles.join(', ')}`,
      });
    }

    await next();
  };
}

/**
 * Rate limiting middleware
 * @param options Rate limiting options
 */
export function rateLimit(options: {
  windowMs: number;
  max: number;
  message?: string;
}): MiddlewareHandler<{ Bindings: Env }> {
  return async (c, next) => {
    const ip = c.req.header('CF-Connecting-IP') || 'unknown';
    const key = `rate_limit:${ip}`;

    // Get current count
    const current = await c.env.KV_CACHE.get(key);
    const currentCount = current ? parseInt(current, 10) : 0;

    // Check if rate limit is exceeded
    if (currentCount >= options.max) {
      const resetTime = await c.env.KV_CACHE.get(`${key}:reset`);
      const retryAfter = resetTime ? Math.ceil((parseInt(resetTime, 10) - Date.now()) / 1000) : 60;

      c.header('Retry-After', retryAfter.toString());

      throw new HTTPException(429, {
        message: options.message || 'Too many requests, please try again later.',
        headers: {
          'Retry-After': retryAfter.toString(),
          'X-RateLimit-Limit': options.max.toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': resetTime || (Date.now() + options.windowMs).toString(),
        },
      });
    }

    // Set initial values if this is the first request
    if (currentCount === 0) {
      await c.env.KV_CACHE.put(`${key}:reset`, (Date.now() + options.windowMs).toString(), {
        expirationTtl: Math.ceil(options.windowMs / 1000) * 2,
      });
    }

    // Increment the counter
    await c.env.KV_CACHE.put(key, (currentCount + 1).toString(), {
      expirationTtl: Math.ceil(options.windowMs / 1000) * 2,
    });

    // Set rate limit headers
    c.header('X-RateLimit-Limit', options.max.toString());
    c.header('X-RateLimit-Remaining', (options.max - currentCount - 1).toString());

    await next();
  };
}

/**
 * API key authentication middleware
 */
export function apiKeyAuth(validKeys: string[]): MiddlewareHandler {
  return async (c, next) => {
    const apiKey = c.req.header('X-API-Key');

    if (!apiKey || !validKeys.includes(apiKey)) {
      throw new HTTPException(401, { message: 'Invalid API key' });
    }

    await next();
  };
}
