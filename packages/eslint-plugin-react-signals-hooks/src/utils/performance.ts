import type { RuleContext } from '@typescript-eslint/utils/ts-eslint';
import type { TSESTree } from '@typescript-eslint/utils';

import type { PerformanceBudget, PerformanceMetrics } from './types.js';
import { validatePerformanceOptions } from './validate-performance-options.js';
import { type PerformanceOperation, PerformanceOperations } from './performance-constants.js';

export // Default performance budget values
const DEFAULT_PERFORMANCE_BUDGET: PerformanceBudget = {
  maxTime: 50, // ms
  maxNodes: 2000,
  maxMemory: 50 * 1024 * 1024, // 50MB
  maxOperations: {
    [PerformanceOperations.signalAccess]: 1000,
    [PerformanceOperations.signalCheck]: 500,
    [PerformanceOperations.effectCheck]: 500,
    [PerformanceOperations.identifierResolution]: 1000,
    [PerformanceOperations.scopeLookup]: 1000,
    [PerformanceOperations.typeCheck]: 500,
  },
  enableMetrics: false,
  logMetrics: false,
};

export class PerformanceLimitExceededError extends Error {
  constructor(
    public readonly metric: string,
    public readonly limit: number,
    public readonly actual: number
  ) {
    super(`Performance limit exceeded: ${metric} (limit: ${limit}, actual: ${actual})`);
    this.name = 'PerformanceLimitExceededError';
  }
}

const performanceMetrics = new Map<string, PerformanceMetrics>();

const phaseStack: Array<{
  key: string;
  startTime: number;
  memoryAtStart?: NodeJS.MemoryUsage;
}> = [];

export function startTracking<Options extends unknown[]>(
  context: RuleContext<string, Options>,
  perfKey: string,
  budget: PerformanceBudget,
  ruleName: string
): void {
  // Validate performance budget if provided
  if (budget) {
    const validation = validatePerformanceOptions(budget, perfKey);

    if (!validation.valid) {
      // Log validation errors but don't fail
      console.warn(`[${perfKey}] Invalid performance options:`, validation.errors.join('; '));
    }
  }

  const startTime = performance.now();

  const memoryAtStart = process.memoryUsage();

  // Initialize all metrics with default values
  const initialMetrics: PerformanceMetrics = {
    startTime,
    nodeCount: 0,
    operationCounts: {},
    filePath: context.filename,
    ruleName,
    perfBudget: budget,
    phaseDurations: {},
    customMetrics: {},
    exceededBudget: false,
    budgetExceededBy: 0,
    memoryUsage: memoryAtStart,
    memoryDelta: 0,
  };

  performanceMetrics.set(perfKey, initialMetrics);

  // Start with an initial phase if metrics are enabled
  if (budget?.enableMetrics !== true) {
    startPhase(perfKey, 'total');
  }

  return;
}

function incrementNodeCount(key: string, nodeType?: string): void {
  const metrics = performanceMetrics.get(key);

  if (!metrics) {
    return;
  }

  metrics.nodeCount++;

  if (nodeType) {
    metrics.operationCounts[nodeType] = (metrics.operationCounts[nodeType] || 0) + 1;
  }
}

export function trackOperation(
  key: string,
  operation: PerformanceOperation,
  count: number = 1
): void {
  const metrics = performanceMetrics.get(key);

  if (!metrics) {
    return;
  }

  const newCount = (metrics.operationCounts[operation] || 0) + count;

  metrics.operationCounts[operation] = newCount;

  const operationLimit = metrics.perfBudget?.maxOperations?.[operation];

  if (operationLimit !== undefined && newCount > operationLimit) {
    throw new PerformanceLimitExceededError(
      `Operation '${operation}' count`,
      operationLimit,
      newCount
    );
  }
}

export function startPhase(key: string, phaseName: string): void {
  const metrics = performanceMetrics.get(key);

  if (!metrics) {
    return;
  }

  endPhase(key, phaseName);

  phaseStack.push({ key, startTime: performance.now() });

  if (typeof metrics.phaseDurations === 'undefined') {
    metrics.phaseDurations = {};
  }

  if (typeof metrics.phaseDurations[phaseName] === 'undefined') {
    metrics.phaseDurations[phaseName] = 0;
  }
}

export function endPhase(key: string, phaseName: string): void {
  const metrics = performanceMetrics.get(key);

  if (
    typeof metrics === 'undefined' ||
    typeof metrics.phaseDurations === 'undefined' ||
    phaseStack.length === 0
  ) {
    return;
  }

  const phase = phaseStack.pop();
  if (typeof phase === 'undefined' || phase.key !== key) {
    if (phase) {
      phaseStack.push(phase);
    }

    return;
  }

  const duration = performance.now() - phase.startTime;

  metrics.phaseDurations[phaseName] = (metrics.phaseDurations[phaseName] || 0) + duration;
}

export function recordMetric<T>(key: string, name: string, value: T): void {
  const metrics = performanceMetrics.get(key);

  if (typeof metrics === 'undefined') {
    return;
  }

  if (typeof metrics.customMetrics === 'undefined') {
    metrics.customMetrics = {};
  }

  metrics.customMetrics[name] = value;
}

export function stopTracking(key: string): PerformanceMetrics | undefined {
  const metrics = performanceMetrics.get(key);

  if (typeof metrics === 'undefined') {
    return undefined;
  }

  if (
    phaseStack.some(
      (phase: { key: string; startTime: number; memoryAtStart?: NodeJS.MemoryUsage }): boolean => {
        return phase.key === key;
      }
    )
  ) {
    endPhase(key, 'total');
  }

  metrics.endTime = performance.now();

  metrics.duration = metrics.endTime - metrics.startTime;

  if (metrics.perfBudget?.maxTime && metrics.duration > metrics.perfBudget.maxTime) {
    metrics.exceededBudget = true;

    metrics.budgetExceededBy = metrics.duration - metrics.perfBudget.maxTime;

    if (metrics.perfBudget.logMetrics) {
      console.warn(
        `[${metrics.ruleName}] Performance budget exceeded: ` +
          `Time limit of ${metrics.perfBudget.maxTime}ms exceeded by ${metrics.budgetExceededBy.toFixed(2)}ms`
      );
    }
  }

  if (metrics.perfBudget?.maxNodes && metrics.nodeCount > metrics.perfBudget.maxNodes) {
    metrics.exceededBudget = true;

    const exceededBy = metrics.nodeCount - metrics.perfBudget.maxNodes;

    if (metrics.perfBudget.logMetrics) {
      console.warn(
        `[${metrics.ruleName}] Performance budget exceeded: ` +
          `Node limit of ${metrics.perfBudget.maxNodes} exceeded by ${exceededBy} nodes`
      );
    }
  }

  const memoryUsage = process.memoryUsage();

  if (metrics.perfBudget?.maxMemory && memoryUsage.heapUsed > metrics.perfBudget.maxMemory) {
    metrics.exceededBudget = true;

    const exceededBy = memoryUsage.heapUsed - metrics.perfBudget.maxMemory;

    if (metrics.perfBudget.logMetrics) {
      console.warn(
        `[${metrics.ruleName}] Performance budget exceeded: ` +
          `Memory limit of ${formatBytes(metrics.perfBudget.maxMemory)} ` +
          `exceeded by ${formatBytes(exceededBy)}`
      );
    }
  }

  if (metrics.perfBudget) {
    const { maxTime, maxMemory, maxNodes } = metrics.perfBudget;

    if (maxTime !== undefined && metrics.duration > maxTime) {
      metrics.exceededBudget = true;

      metrics.budgetExceededBy = metrics.duration - maxTime;
    }

    if (maxMemory !== undefined && memoryUsage.heapUsed > maxMemory) {
      metrics.exceededBudget = true;
    }

    if (maxNodes !== undefined && metrics.nodeCount > maxNodes) {
      metrics.exceededBudget = true;
    }
  }

  if (metrics.perfBudget?.logMetrics) {
    console.info(`[Performance Metrics] ${metrics.ruleName} (${metrics.filePath})`);

    console.info(`  Duration: ${metrics.duration.toFixed(2)}ms`);

    console.info(`  Node count: ${metrics.nodeCount}`);

    if (metrics.memoryUsage && 'heapUsed' in memoryUsage) {
      const endMemory = memoryUsage.heapUsed;

      console.info(`  Memory usage: ${endMemory.toLocaleString()} bytes`);
      console.info(
        `  Memory delta: ${(endMemory - metrics.memoryUsage.heapUsed).toLocaleString()} bytes`
      );
    }
  }

  performanceMetrics.delete(key);

  return metrics;
}

export function logMetrics<Options extends unknown[]>(
  metrics: PerformanceMetrics,
  context: RuleContext<string, Options>
): void {
  if (typeof metrics.endTime === 'undefined') {
    return;
  }

  context.report({
    messageId: 'perf',
    loc: { line: 1, column: 0 },
    data: {
      message: `[Perf] ${metrics.ruleName}: Processed ${metrics.nodeCount} nodes in ${(metrics.endTime - metrics.startTime).toFixed(2)}ms${
        metrics.memoryUsage
          ? `, Memory: ${formatBytes(metrics.memoryUsage.heapUsed)} / ${formatBytes(metrics.memoryUsage.heapTotal)}`
          : ''
      }${
        metrics.exceededBudget
          ? ` [BUDGET EXCEEDED by ${metrics.budgetExceededBy?.toFixed(2)}ms]`
          : ''
      }`,
    },
  });
}

function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) {
    return '0 Bytes';
  }

  const k = 1024;
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Number.parseFloat((bytes / k ** i).toFixed(decimals < 0 ? 0 : decimals))} ${['Bytes', 'KB', 'MB', 'GB'][i]}`;
}

export function createPerformanceTracker<Options extends unknown[]>(
  key: string,
  budget: PerformanceBudget | undefined,
  context: RuleContext<string, Options>
): { trackNode(node: TSESTree.Node): void; 'Program:exit'(): void } {
  const metrics = performanceMetrics.get(key);

  if (typeof metrics !== 'undefined') {
    // Store budget on the metrics object for later checking
    metrics.perfBudget = budget;
  }

  return {
    trackNode(node: TSESTree.Node) {
      const currentMetrics = performanceMetrics.get(key);
      if (!currentMetrics) {
        return;
      }

      // Increment node count and track operation
      incrementNodeCount(key, node.type);

      // Track node type distribution
      const nodeType = node.type;

      // Initialize node type tracking if not exists
      if (!currentMetrics.nodeTypes) {
        currentMetrics.nodeTypes = new Map();
      }

      // Increment count for this node type
      const currentCount = currentMetrics.nodeTypes.get(nodeType) ?? 0;
      currentMetrics.nodeTypes.set(nodeType, currentCount + 1);

      // Track node locations for debugging if location is available
      if (node.loc) {
        currentMetrics.nodeLocations ??= [];
        currentMetrics.nodeLocations.push({
          type: nodeType,
          start: node.loc.start,
          end: node.loc.end,
        });
      }

      // Check node count budget if maxNodes is defined
      const maxNodes = budget?.maxNodes;
      if (typeof maxNodes === 'number' && currentMetrics.nodeCount > maxNodes) {
        currentMetrics.exceededBudget = true;
        currentMetrics.budgetExceededBy = (currentMetrics.budgetExceededBy ?? 0) + 1;

        // Initialize and add to budget exceeded node types
        currentMetrics.budgetExceededNodeTypes ??= new Set();
        currentMetrics.budgetExceededNodeTypes.add(nodeType);
      }
    },

    'Program:exit'() {
      const metrics = stopTracking(key);

      if (typeof metrics !== 'undefined') {
        if (
          typeof budget?.maxTime !== 'undefined' &&
          typeof metrics.endTime !== 'undefined' &&
          typeof metrics.startTime !== 'undefined'
        ) {
          const duration = metrics.endTime - metrics.startTime;

          if (duration > budget.maxTime) {
            metrics.exceededBudget = true;

            metrics.budgetExceededBy = duration - budget.maxTime;
          }
        }

        if (
          typeof budget?.maxMemory !== 'undefined' &&
          typeof metrics.memoryUsage !== 'undefined'
        ) {
          if (metrics.memoryUsage.heapUsed > budget.maxMemory) {
            metrics.exceededBudget = true;
          }
        }

        logMetrics(metrics, context);
      }
    },
  };
}
