import type { PerformanceMetrics } from './performance.js';
import type { PerformanceOperations } from './performance-constants.js';

type AggregatedMetrics = {
  // Basic counts
  totalFiles: number;
  totalNodes: number;
  totalDuration: number;

  // Operation counts
  operationCounts: Record<string, number>;

  // Performance metrics
  avgDuration: number;
  maxDuration: number;
  minDuration: number;

  // Memory usage (in bytes)
  avgMemoryDelta: number;
  maxMemoryDelta: number;
  minMemoryDelta: number;

  // Budget exceed
  filesExceededBudget: number;
  commonExceededOperations: Array<{ operation: string; count: number }>;

  // Performance by file size
  performanceByFileSize: Array<{
    sizeRange: string;
    count: number;
    avgDuration: number;
  }>;
};

class MetricsAggregator {
  private metrics: PerformanceMetrics[] = [];
  private static instance: MetricsAggregator;

  private constructor() {}

  public static getInstance(): MetricsAggregator {
    if (!MetricsAggregator.instance) {
      MetricsAggregator.instance = new MetricsAggregator();
    }
    return MetricsAggregator.instance;
  }

  public addMetrics(metrics: PerformanceMetrics): void {
    this.metrics.push(metrics);
  }

  public getAggregatedMetrics(): AggregatedMetrics {
    if (this.metrics.length === 0) {
      return this.getEmptyAggregatedMetrics();
    }

    const aggregated: AggregatedMetrics = {
      totalFiles: this.metrics.length,
      totalNodes: 0,
      totalDuration: 0,
      operationCounts: {},
      avgDuration: 0,
      maxDuration: 0,
      minDuration: Infinity,
      avgMemoryDelta: 0,
      maxMemoryDelta: 0,
      minMemoryDelta: Infinity,
      filesExceededBudget: 0,
      commonExceededOperations: [],
      performanceByFileSize: [],
    };

    // Group metrics by file size ranges
    const sizeGroups = new Map<string, { count: number; totalDuration: number }>();
    const sizeRanges = [
      { name: '0-100', min: 0, max: 100 },
      { name: '101-500', min: 101, max: 500 },
      { name: '501-1000', min: 501, max: 1000 },
      { name: '1001-5000', min: 1001, max: 5000 },
      { name: '5001+', min: 5001, max: Infinity },
    ];

    // Initialize size groups
    sizeRanges.forEach((range) => {
      sizeGroups.set(range.name, { count: 0, totalDuration: 0 });
    });

    // Process each metric
    const operationCounts = new Map<string, number>();
    const exceededOperations = new Map<string, number>();

    this.metrics.forEach((metric) => {
      // Basic metrics
      aggregated.totalNodes += metric.nodeCount || 0;
      const duration = metric.duration || 0;
      aggregated.totalDuration += duration;
      aggregated.maxDuration = Math.max(aggregated.maxDuration, duration);
      aggregated.minDuration = Math.min(aggregated.minDuration, duration);

      // Memory metrics
      const memoryDelta = metric.memoryDelta || 0;
      aggregated.maxMemoryDelta = Math.max(aggregated.maxMemoryDelta, memoryDelta);
      aggregated.minMemoryDelta = Math.min(aggregated.minMemoryDelta, memoryDelta);

      // Budget exceedance
      if (metric.exceededBudget) {
        aggregated.filesExceededBudget++;
      }

      // Operation counts
      if (metric.operationCounts) {
        Object.entries(metric.operationCounts).forEach(([op, count]) => {
          const current = operationCounts.get(op) || 0;
          operationCounts.set(op, current + count);

          // Track operations that caused budget exceedance
          if (
            metric.exceededBudget &&
            count >
              (metric.perfBudget?.maxOperations?.[op as keyof typeof PerformanceOperations] || 0)
          ) {
            const currentExceeded = exceededOperations.get(op) || 0;
            exceededOperations.set(op, currentExceeded + 1);
          }
        });
      }

      // Group by file size (node count)
      const nodeCount = metric.nodeCount || 0;
      for (const range of sizeRanges) {
        if (nodeCount >= range.min && nodeCount <= range.max) {
          const group = sizeGroups.get(range.name);

          if (typeof group !== 'undefined') {
            group.count++;
            group.totalDuration += duration;
          }

          break;
        }
      }
    });

    // Calculate averages
    aggregated.avgDuration = aggregated.totalDuration / aggregated.totalFiles;

    aggregated.avgMemoryDelta =
      this.metrics.reduce((sum, m) => sum + (m.memoryDelta || 0), 0) / aggregated.totalFiles;

    // Convert operation counts to object
    operationCounts.forEach((count, op) => {
      aggregated.operationCounts[op] = count;
    });

    // Sort and get top 5 most common exceeded operations
    aggregated.commonExceededOperations = Array.from(exceededOperations.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([operation, count]) => ({ operation, count }));

    // Calculate performance by file size
    aggregated.performanceByFileSize = sizeRanges
      .map((range: { name: string; min: number; max: number }) => {
        const group = sizeGroups.get(range.name);

        if (typeof group === 'undefined') {
          return null;
        }

        return {
          sizeRange: range.name,
          ...group,
        };
      })
      .filter(
        (
          group: {
            count?: number | undefined;
            totalDuration?: number | undefined;
            sizeRange: string;
          } | null
        ): group is { count: number; totalDuration: number; sizeRange: string } => {
          return group !== null && typeof group.count !== 'undefined' && group.count > 0;
        }
      )
      .map((group: { count: number; totalDuration: number; sizeRange: string }) => {
        return {
          sizeRange: group.sizeRange,
          count: group.count,
          avgDuration: group.totalDuration / group.count,
        };
      });

    return aggregated;
  }

  public clear(): void {
    this.metrics = [];
  }

  private getEmptyAggregatedMetrics(): AggregatedMetrics {
    return {
      totalFiles: 0,
      totalNodes: 0,
      totalDuration: 0,
      operationCounts: {},
      avgDuration: 0,
      maxDuration: 0,
      minDuration: 0,
      avgMemoryDelta: 0,
      maxMemoryDelta: 0,
      minMemoryDelta: 0,
      filesExceededBudget: 0,
      commonExceededOperations: [],
      performanceByFileSize: [],
    };
  }
}

export const metricsAggregator = MetricsAggregator.getInstance();

export function logAggregatedMetrics(): void {
  const aggregated = metricsAggregator.getAggregatedMetrics();

  console.info('\n=== ESLint Performance Metrics ===');
  console.info(`Total files analyzed: ${aggregated.totalFiles}`);
  console.info(`Total nodes processed: ${aggregated.totalNodes}`);
  console.info(`Average duration: ${aggregated.avgDuration.toFixed(2)}ms`);
  console.info(`Max duration: ${aggregated.maxDuration.toFixed(2)}ms`);
  console.info(`Min duration: ${aggregated.minDuration.toFixed(2)}ms`);

  if (aggregated.filesExceededBudget > 0) {
    console.info(`\n⚠️  ${aggregated.filesExceededBudget} files exceeded performance budget`);
    if (aggregated.commonExceededOperations.length > 0) {
      console.info('Most common exceeded operations:');
      aggregated.commonExceededOperations.forEach(({ operation, count }) => {
        console.info(`  - ${operation}: ${count} files`);
      });
    }
  }

  if (aggregated.performanceByFileSize.length > 0) {
    console.info('\nPerformance by file size (nodes):');
    console.table(aggregated.performanceByFileSize);
  }

  if (Object.keys(aggregated.operationCounts).length > 0) {
    console.info('\nOperation counts:');
    console.table(
      Object.entries(aggregated.operationCounts)
        .sort((a, b) => b[1] - a[1])
        .map(([operation, count]) => ({
          Operation: operation,
          Count: count,
          'Avg per file': (count / aggregated.totalFiles).toFixed(2),
        }))
    );
  }

  console.info('==================================\n');
}
