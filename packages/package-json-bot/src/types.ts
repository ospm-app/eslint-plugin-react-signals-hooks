import type { Context } from 'hono';

// Environment variables type
export interface Env {
  // Environment
  NODE_ENV: 'development' | 'production' | 'test';
  LOG_LEVEL?: 'debug' | 'info' | 'warn' | 'error';

  // Cloudflare bindings
  KV_CACHE: KVNamespace;
  R2_BUCKET: R2Bucket;
  ANALYSIS_LOCK: DurableObjectNamespace;

  // API Keys
  ALCHEMY_API_KEY: string;
}

// Package analysis request/response types
export interface PackageAnalysisRequest {
  name: string;
  version: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export interface PackageAnalysisResponse {
  package: string;
  version: string;
  analysis: string;
  timestamp: string;
  metadata: {
    model: string;
    tokens_used: number;
    cache_hit: boolean;
  };
}

// Error response type
export interface ErrorResponse {
  error: string;
  message?: string;
  details?: unknown;
}

// Custom context type with our environment
export type AppContext = Context<{
  Bindings: Env;
  Variables: {
    startTime: number;
    requestId: string;
    // Add any other custom variables here
  };
}>;

// Type for the package metadata from npm
export interface NpmPackageMetadata {
  name: string;
  version: string;
  description?: string;
  repository?: {
    type: string;
    url: string;
  };
  homepage?: string;
  bugs?: {
    url: string;
  };
  license?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  engines?: {
    node?: string;
    npm?: string;
  };
  // Add other npm package fields as needed
}

// Type for the analysis result
export interface AnalysisResult {
  summary: string;
  dependencies: Array<{
    name: string;
    version: string;
    status: 'up-to-date' | 'outdated' | 'vulnerable' | 'unknown';
    latest?: string;
    severity?: 'low' | 'medium' | 'high' | 'critical';
    description?: string;
  }>;
  recommendations: string[];
  warnings: string[];
  metadata: {
    analyzedAt: string;
    analysisTimeMs: number;
  };
}
