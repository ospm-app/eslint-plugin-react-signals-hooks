import { Hono } from 'hono';
import { z } from 'zod';
import { PackageAnalysisService } from '../services/package-analysis';
import { rateLimit } from '../middleware/auth';
import { log } from '../utils/logger';
import type { Env } from '../types';
import { AnalysisError, PackageNotFoundError } from '../middleware/error-handler';

// Create a new router for analysis endpoints
export const analyzeRouter = new Hono<{ Bindings: Env }>();

// Schema for package analysis request
const packageAnalysisSchema = z.object({
  name: z.string().min(1, 'Package name is required'),
  version: z.string().default('latest'),
  dependencies: z.record(z.string()).optional(),
  devDependencies: z.record(z.string()).optional(),
});

// Apply rate limiting to all analysis routes
analyzeRouter.use('*', rateLimit({ windowMs: 60 * 1000, max: 30 }));

// Analyze a package
analyzeRouter.post('/', async (c) => {
  const requestId = c.get('requestId');
  const startTime = Date.now();

  try {
    // Parse and validate request body
    const body = await c.req.json();
    const data = packageAnalysisSchema.parse(body);

    const { name, version, dependencies, devDependencies } = data;

    log(`[${requestId}] Analyzing package: ${name}@${version}`, 'info', {
      hasDependencies: !!dependencies,
      hasDevDependencies: !!devDependencies,
    });

    // Initialize the analysis service
    const analysisService = new PackageAnalysisService(c.env);

    // Perform the analysis
    const result = await analysisService.analyzePackage({
      name,
      version,
      dependencies,
      devDependencies,
    });

    // Log successful analysis
    log(`[${requestId}] Analysis completed for: ${name}@${version}`, 'info', {
      analysisTime: Date.now() - startTime,
      cacheHit: result.metadata.cacheHit,
    });

    return c.json({
      success: true,
      data: result,
      metadata: {
        requestId,
        analysisTimeMs: Date.now() - startTime,
      },
    });
  } catch (error) {
    // Handle validation errors
    if (error instanceof z.ZodError) {
      return c.json(
        {
          success: false,
          error: 'Validation Error',
          details: error.errors,
        },
        400
      );
    }

    // Handle known errors
    if (error instanceof PackageNotFoundError) {
      return c.json(
        {
          success: false,
          error: 'Package not found',
          message: error.message,
        },
        404
      );
    }

    if (error instanceof AnalysisError) {
      return c.json(
        {
          success: false,
          error: 'Analysis failed',
          message: error.message,
          details: error.cause,
        },
        500
      );
    }

    // Log unexpected errors
    log(`[${requestId}] Analysis error: ${error.message}`, 'error', {
      error: error.toString(),
      stack: error.stack,
      analysisTime: Date.now() - startTime,
    });

    // Return generic error
    return c.json(
      {
        success: false,
        error: 'Internal Server Error',
        message: 'An unexpected error occurred during analysis',
        requestId,
      },
      500
    );
  }
});

// Get analysis status
analyzeRouter.get('/status/:id', async (c) => {
  const requestId = c.req.param('id');
  const cacheKey = `analysis:${requestId}`;

  try {
    // Check if the analysis is in progress or completed
    const status = await c.env.KV_CACHE.get(cacheKey);

    if (!status) {
      return c.json(
        {
          status: 'not_found',
          message: 'Analysis not found or expired',
        },
        404
      );
    }

    const result = JSON.parse(status);

    if (result.status === 'completed') {
      return c.json({
        status: 'completed',
        data: result.data,
        metadata: result.metadata,
      });
    }

    return c.json({
      status: 'in_progress',
      startedAt: result.startedAt,
      progress: result.progress,
    });
  } catch (error) {
    log(`Error getting analysis status: ${error.message}`, 'error', {
      requestId,
      error: error.toString(),
    });

    return c.json(
      {
        status: 'error',
        error: 'Failed to get analysis status',
        message: error.message,
      },
      500
    );
  }
});

// Get analysis history for a package
analyzeRouter.get('/history/:name', async (c) => {
  const packageName = c.req.param('name');
  const limit = parseInt(c.req.query('limit') || '10', 10);

  try {
    // In a real app, you would query your database for historical analyses
    // This is a simplified example
    const historyKey = `history:${packageName}`;
    const history = (await c.env.KV_CACHE.get(historyKey, { type: 'json' })) || [];

    return c.json({
      success: true,
      data: history.slice(0, limit),
      total: history.length,
    });
  } catch (error) {
    log(`Error fetching analysis history: ${error.message}`, 'error', {
      packageName,
      error: error.toString(),
    });

    return c.json(
      {
        success: false,
        error: 'Failed to fetch analysis history',
        message: error.message,
      },
      500
    );
  }
});
