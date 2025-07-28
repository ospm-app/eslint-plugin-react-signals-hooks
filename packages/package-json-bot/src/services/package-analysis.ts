import { Alchemy, Network } from 'alchemy-sdk';
import { z } from 'zod';
import type { Env } from '../types';
import { log } from '../utils/logger';
import { AnalysisError, PackageNotFoundError } from '../middleware/error-handler';

// Schema for package metadata from npm registry
const npmPackageSchema = z.object({
  name: z.string(),
  version: z.string(),
  description: z.string().optional(),
  repository: z
    .union([
      z.object({
        type: z.string(),
        url: z.string(),
      }),
      z.string(),
    ])
    .optional(),
  homepage: z.string().optional(),
  bugs: z
    .union([
      z.object({
        url: z.string(),
      }),
      z.string(),
    ])
    .optional(),
  license: z
    .union([
      z.string(),
      z.object({
        type: z.string(),
        url: z.string(),
      }),
    ])
    .optional(),
  dependencies: z.record(z.string()).optional(),
  devDependencies: z.record(z.string()).optional(),
  peerDependencies: z.record(z.string()).optional(),
  optionalDependencies: z.record(z.string()).optional(),
  engines: z.record(z.string()).optional(),
  // Add other npm package fields as needed
});

type NpmPackage = z.infer<typeof npmPackageSchema>;

export interface AnalysisResult {
  package: string;
  version: string;
  analysis: string;
  metadata: {
    model: string;
    tokens_used: number;
    cache_hit: boolean;
    analyzed_at: string;
  };
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
}

export class PackageAnalysisService {
  private alchemy: Alchemy;
  private cache: KVNamespace;
  private storage: R2Bucket;

  constructor(env: Env) {
    this.alchemy = new Alchemy({
      apiKey: env.ALCHEMY_API_KEY,
      network: Network.ETH_MAINNET, // or your preferred network
    });

    this.cache = env.KV_CACHE;
    this.storage = env.R2_BUCKET;
  }

  /**
   * Analyze a package and its dependencies
   */
  async analyzePackage({
    name,
    version = 'latest',
    dependencies = {},
    devDependencies = {},
  }: {
    name: string;
    version?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
  }): Promise<AnalysisResult> {
    const cacheKey = this.getCacheKey(name, version);
    const startTime = Date.now();

    try {
      // Check cache first
      const cached = await this.getCachedAnalysis(cacheKey);
      if (cached) {
        return {
          ...cached,
          metadata: {
            ...cached.metadata,
            cache_hit: true,
          },
        };
      }

      // Fetch package metadata from npm registry
      const pkg = await this.fetchPackageMetadata(name, version);

      // Merge explicit dependencies with package.json dependencies
      const allDependencies = {
        ...(pkg.dependencies || {}),
        ...dependencies,
      };

      const allDevDependencies = {
        ...(pkg.devDependencies || {}),
        ...devDependencies,
      };

      // Generate analysis using Alchemy
      const analysis = await this.generateAnalysis({
        name: pkg.name,
        version: pkg.version,
        description: pkg.description,
        repository: pkg.repository,
        homepage: pkg.homepage,
        dependencies: allDependencies,
        devDependencies: allDevDependencies,
      });

      // Prepare the result
      const result: AnalysisResult = {
        package: pkg.name,
        version: pkg.version,
        analysis,
        dependencies: allDependencies,
        devDependencies: allDevDependencies,
        metadata: {
          model: 'alchemy',
          tokens_used: 0, // Will be updated by the generateAnalysis method
          cache_hit: false,
          analyzed_at: new Date().toISOString(),
        },
      };

      // Cache the result
      await this.cacheAnalysis(cacheKey, result);

      // Log the analysis
      log(`Analyzed ${pkg.name}@${pkg.version} in ${Date.now() - startTime}ms`, 'info', {
        dependencies: Object.keys(allDependencies).length,
        devDependencies: Object.keys(allDevDependencies).length,
      });

      return result;
    } catch (error) {
      throw new AnalysisError(`Failed to analyze package ${name}@${version}`, error);
    }
  }

  /**
   * Fetch package metadata from the npm registry
   */
  private async fetchPackageMetadata(name: string, version: string): Promise<NpmPackage> {
    try {
      const response = await fetch(`https://registry.npmjs.org/${name}/${version}`);

      if (!response.ok) {
        if (response.status === 404) {
          throw new PackageNotFoundError(name, version);
        }
        throw new Error(`Failed to fetch package: ${response.statusText}`);
      }

      const data = await response.json();
      return npmPackageSchema.parse(data);
    } catch (error) {
      if (error instanceof PackageNotFoundError) {
        throw error;
      }
      throw new Error(`Error fetching package metadata: ${error.message}`);
    }
  }

  /**
   * Generate analysis using Alchemy
   */
  private async generateAnalysis(pkg: {
    name: string;
    version: string;
    description?: string;
    repository?: any;
    homepage?: string;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  }): Promise<string> {
    try {
      // Prepare the prompt for Alchemy
      const prompt = this.createAnalysisPrompt(pkg);

      // Call Alchemy API
      const response = await this.alchemy.core.send({
        method: 'alchemy_generateText',
        params: [
          {
            prompt,
            max_tokens: 2000,
            temperature: 0.3,
          },
        ],
      });

      // Extract the generated text
      const analysis = response.result?.text || 'No analysis available';

      // Log token usage
      log(`Generated analysis for ${pkg.name}@${pkg.version}`, 'debug', {
        tokens_used: response.usage?.total_tokens || 0,
      });

      return analysis;
    } catch (error) {
      throw new Error(`Failed to generate analysis: ${error.message}`);
    }
  }

  /**
   * Create a prompt for package analysis
   */
  private createAnalysisPrompt(pkg: {
    name: string;
    version: string;
    description?: string;
    repository?: any;
    homepage?: string;
    dependencies: Record<string, string>;
    devDependencies: Record<string, string>;
  }): string {
    return `Analyze the following npm package and provide a detailed report:

Package: ${pkg.name}@${pkg.version}
${pkg.description ? `Description: ${pkg.description}\n` : ''}
Repository: ${typeof pkg.repository === 'string' ? pkg.repository : pkg.repository?.url || 'Not specified'}
Homepage: ${pkg.homepage || 'Not specified'}

Dependencies (${Object.keys(pkg.dependencies).length}):
${Object.entries(pkg.dependencies)
  .map(([name, version]) => `- ${name}@${version}`)
  .join('\n')}

Dev Dependencies (${Object.keys(pkg.devDependencies).length}):
${Object.entries(pkg.devDependencies)
  .map(([name, version]) => `- ${name}@${version}`)
  .join('\n')}

Please provide a detailed analysis including:
1. Package overview and purpose
2. Dependencies analysis (versions, potential issues)
3. Security considerations
4. Performance implications
5. Best practices for usage
6. Recommended updates or alternatives
7. Any potential issues or concerns

Analysis:`;
  }

  /**
   * Get a cached analysis if it exists
   */
  private async getCachedAnalysis(cacheKey: string): Promise<AnalysisResult | null> {
    try {
      const cached = await this.cache.get(cacheKey, { type: 'json' });
      return cached as AnalysisResult | null;
    } catch (error) {
      log(`Error reading from cache: ${error.message}`, 'warn');
      return null;
    }
  }

  /**
   * Cache the analysis result
   */
  private async cacheAnalysis(cacheKey: string, result: AnalysisResult): Promise<void> {
    try {
      // Cache in KV store with 7-day TTL
      await this.cache.put(
        cacheKey,
        JSON.stringify(result),
        { expirationTtl: 60 * 60 * 24 * 7 } // 7 days
      );

      // Also store in R2 for long-term storage
      await this.storage.put(
        `analyses/${cacheKey}.json`,
        JSON.stringify({
          ...result,
          storedAt: new Date().toISOString(),
        })
      );
    } catch (error) {
      log(`Error caching analysis: ${error.message}`, 'error');
      // Don't fail the request if caching fails
    }
  }

  /**
   * Generate a cache key for a package
   */
  private getCacheKey(name: string, version: string): string {
    return `pkg:${name.toLowerCase()}@${version.toLowerCase()}`;
  }
}
