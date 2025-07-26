import { HTTPException } from 'hono/http-exception';
import { log } from '../utils/logger';
import type { ErrorResponse } from '../types';

export function errorHandler(error: Error, c: any) {
  const requestId = c.get('requestId') || 'unknown';
  const statusCode = error instanceof HTTPException ? error.status : 500;

  // Log the error with request context
  log(`[${requestId}] Error: ${error.message}`, 'error', {
    stack: error.stack,
    status: statusCode,
    path: c.req.path,
    method: c.req.method,
  });

  // Prepare error response
  const errorResponse: ErrorResponse = {
    error: error.name || 'InternalServerError',
    message: error.message || 'An unexpected error occurred',
  };

  // In development, include stack trace
  if (process.env.NODE_ENV === 'development') {
    errorResponse.details = {
      stack: error.stack,
      ...(error.cause && { cause: error.cause }),
    };
  }

  // Return JSON response with appropriate status code
  return c.json(errorResponse, statusCode);
}

// Custom error classes
export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ValidationError';
  }
}

export class RateLimitError extends Error {
  retryAfter: number;

  constructor(message: string, retryAfter: number) {
    super(message);
    this.name = 'RateLimitError';
    this.retryAfter = retryAfter;
  }
}

export class PackageNotFoundError extends Error {
  constructor(packageName: string, version?: string) {
    super(`Package '${packageName}${version ? `@${version}` : ''}' not found`);
    this.name = 'PackageNotFoundError';
  }
}

export class AnalysisError extends Error {
  constructor(message: string, cause?: unknown) {
    super(message);
    this.name = 'AnalysisError';
    if (cause) {
      this.cause = cause;
    }
  }
}

// Helper to create HTTP errors
export function createHttpError(status: number, message: string) {
  return new HTTPException(status, { message });
}

// Helper to handle validation errors
export function handleValidationError(error: unknown) {
  if (error instanceof Error) {
    throw new HTTPException(400, { message: error.message });
  }
  throw new HTTPException(400, { message: 'Invalid request data' });
}
