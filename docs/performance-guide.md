# Performance Guide for ESLint Rules

This guide explains how to integrate performance tracking and optimization into ESLint rules for the `eslint-plugin-react-signals-hooks` package.

## Performance Integration

### 1. Performance Budget

Each rule should accept an optional `performance` option in its configuration with these common settings:

```typescript
interface PerformanceBudget {
  // Time limit in milliseconds per file
  maxTime?: number;  // Default: 50ms
  
  // Maximum number of nodes to process
  maxNodes?: number;  // Default: 2000
  
  // Memory limit in bytes
  maxMemory?: number;  // Default: 50MB
  
  // Operation-specific limits
  maxOperations?: {
    [PerformanceOperations.signalAccess]?: number;    // Default: 1000
    [PerformanceOperations.signalCheck]?: number;     // Default: 500
    [PerformanceOperations.effectCheck]?: number;     // Default: 500
    [PerformanceOperations.identifierResolution]?: number;  // Default: 1000
    [PerformanceOperations.scopeLookup]?: number;     // Default: 1000
    [PerformanceOperations.typeCheck]?: number;       // Default: 500
  };
  
  // Enable detailed performance metrics
  enableMetrics?: boolean;  // Default: false
  
  // Log performance metrics to console
  logMetrics?: boolean;     // Default: false
}
```

### 2. Performance Tracking Utilities

Import and use these performance tracking utilities from `./utils/performance.js`:

```typescript
import {
  createPerformanceTracker,
  trackOperation,
  startPhase,
  endPhase,
  recordMetric,
  stopTracking,
  PerformanceLimitExceededError,
} from './utils/performance.js';
import { PerformanceOperations } from './utils/performance-constants.js';
```

## Rule Implementation Pattern

### 1. Basic Rule Structure

```typescript
export const rule = createRule<Options, MessageIds>({
  name: 'rule-name',
  meta: {
    type: 'problem',
    docs: {
      description: 'Rule description',
      recommended: 'recommended',
    },
    messages: {
      performanceLimitExceeded: 'Performance limit exceeded: {{message}}',
      // other messages
    },
    schema: [
      // Rule schema
    ],
  },

  defaultOptions: [{
    // Default options including performance settings
    performance: {
      maxTime: 50,        // ms
      maxNodes: 2000,     // nodes
      maxMemory: 50 * 1024 * 1024,  // 50MB
      logMetrics: false,
    },
  }],

  create(context, [options = {}]) {
    // Set up performance tracking with a unique key
    const perfKey = `rule-name:${context.filename}`;

    // Initialize performance budget with defaults
    const perfBudget: PerformanceBudget = {
      maxTime: options.performance?.maxTime ?? 50,
      maxNodes: options.performance?.maxNodes ?? 2000,
      maxMemory: options.performance?.maxMemory ?? 50 * 1024 * 1024,
      maxOperations: {
        [PerformanceOperations.signalAccess]: 1000,
        [PerformanceOperations.signalCheck]: 500,
        // ... other operations
      },
      enableMetrics: options.performance?.enableMetrics ?? false,
      logMetrics: options.performance?.logMetrics ?? false,
    };

    // Create performance tracker
    const perf = createPerformanceTracker(perfKey, perfBudget, context);
    
    // Track node processing
    let nodeCount = 0;

    // Helper function to check if we should continue processing
    function shouldContinue(): boolean {
      nodeCount++;

      // Check if we've exceeded the node budget
      if (nodeCount > (options.performance?.maxNodes ?? 2000)) {
        trackOperation(perfKey, 'nodeBudgetExceeded');

        return false;
      }

      return true;
    }

    // Track the operation
    try {
      trackOperation(perfKey, operation);
      return true;
    } catch (error) {
      if (error instanceof PerformanceLimitExceededError) {
        context.report({
          node: { type: 'Program' } as TSESTree.Node,
          messageId: 'performanceLimitExceeded',
          data: { message: error.message },
        });

        return false;
      }

      throw error;
    }
    
    // Rule implementation
    return {
      // Track all nodes
      '*': (node: TSESTree.Node) => {
        perf.trackNode(node);

        if (!shouldContinue('nodeProcessing')) { 
          return;
        }

        // Rule-specific node handling
        // ...
      },

      // Clean up on program exit
      'Program:exit'(node: TSESTree.Node): void {
         if (!perf) {
          throw new Error('Performance tracker not initialized');
        }

        startPhase(perfKey, 'programExit');

        perf.trackNode(node);

        try {
          startPhase(perfKey, 'recordMetrics');

          const finalMetrics = stopTracking(perfKey);

          if (finalMetrics) {
            const { exceededBudget, nodeCount, duration } = finalMetrics;
            const status = exceededBudget ? 'EXCEEDED' : 'OK';

            console.info(`\n[prefer-batch-updates] Performance Metrics (${status}):`);
            console.info(`  File: ${context.filename}`);
            console.info(`  Duration: ${duration?.toFixed(2)}ms`);
            console.info(`  Nodes Processed: ${nodeCount}`);

            if (exceededBudget) {
              console.warn('\n⚠️  Performance budget exceeded!');
            }
          }
        } catch (error: unknown) {
          console.error('Error recording metrics:', error);
        } finally {
          endPhase(perfKey, 'recordMetrics');

          stopTracking(perfKey);
        }

        perf['Program:exit']();

        endPhase(perfKey, 'programExit');
      }
    };
  },
});
```

### 2. Tracking Operations

Use `trackOperation` to measure specific operations:

```typescript
function checkSignalAccess(node: TSESTree.Node) {
  return trackOperation(perfKey, PerformanceOperations.signalAccess, () => {
    metrics.signalChecks++;
    // Expensive signal check logic
  });
}
```

### 3. Using Phases

Group related operations into phases for better metrics:

```typescript
function analyzeComponent(node: TSESTree.FunctionDeclaration) {
  startPhase(perfKey, 'componentAnalysis');
  try {
    // Analysis code
    startPhase(perfKey, 'signalDetection');
    try {
      // Signal detection logic
    } finally {
      endPhase(perfKey, 'signalDetection');
    }
  } finally {
    endPhase(perfKey, 'componentAnalysis');
  }
}
```

## Performance Budget Recommendations

| Rule Type | maxTime (ms) | maxNodes | maxMemory |
|-----------|-------------|----------|-----------|
| Simple    | 20-30       | 1000     | 20MB      |
| Medium    | 40-60       | 2000     | 50MB      |
| Complex   | 60-100      | 5000     | 100MB     |

## Common Performance Operations

Use these standard operation names from `PerformanceOperations`:

- `signalAccess`: Accessing signal values
- `signalUpdate`: Updating signal values
- `signalCheck`: Checking if something is a signal
- `effectCheck`: Analyzing effect hooks
- `scopeLookup`: Scope analysis operations
- `typeCheck`: Type checking operations
- `nodeProcessing`: General AST node processing

## Best Practices

1. **Measure First**: Always profile the rule with realistic codebases to identify bottlenecks.
2. **Set Realistic Limits**: Configure default performance budgets based on real-world usage.
3. **Fail Fast**: Stop processing as soon as a performance limit is exceeded.
4. **Use Caching**: Cache expensive computations when possible.
5. **Be Selective**: Only track operations that are likely to be expensive.
6. **Document Performance Characteristics**: Add JSDoc comments explaining the time/space complexity of complex operations.

## Performance Testing

Add performance tests to ensure the rule remains efficient:

```typescript
describe('performance', () => {
  it('should handle large files efficiently', () => {
    const largeCode = generateLargeCode();
    const ruleTester = new RuleTester({
      parser: require.resolve('@typescript-eslint/parser'),
    });
    
    const start = process.hrtime.bigint();
    ruleTester.run('rule-name', rule, {
      valid: [],
      invalid: [
        {
          code: largeCode,
          options: [{
            performance: {
              maxTime: 1000, // 1 second limit
              logMetrics: true,
            },
          }],
          errors: [{ messageId: 'performanceLimitExceeded' }],
        },
      ],
    });
    const end = process.hrtime.bigint();
    const durationMs = Number(end - start) / 1e6;
    
    expect(durationMs).toBeLessThan(2000); // Test should complete within 2 seconds
  });
});
```

## Performance Tuning

1. **Optimize Hot Paths**: Focus on the most frequently executed code paths.
2. **Reduce AST Traversals**: Minimize the number of times you traverse the AST.
3. **Use Early Returns**: Exit early when possible to avoid unnecessary work.
4. **Lazy Evaluation**: Only compute what's needed when it's needed.
5. **Memory Management**: Be mindful of memory usage, especially with large codebases.
