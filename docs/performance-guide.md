# Performance Guide for ESLint Rules

This guide explains how to integrate performance tracking and optimization into ESLint rules for the `eslint-plugin-*` package.

## Performance Integration

### 1. Performance Budget

Each rule should accept an optional `performance` option in its configuration:

```typescript
type PerformanceBudget = {
  // Time limits in milliseconds
  maxTimePerFile?: number;
  maxTotalTime?: number;
  
  // Memory limits in bytes
  maxMemoryPerFile?: number;
  maxTotalMemory?: number;
  
  // Operation limits
  maxOperationsPerFile?: number;
  maxTotalOperations?: number;
};
```

### 2. Performance Tracking

Use the performance tracking utilities from `./utils/performance.js`:

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

### 3. Rule Structure

1. **Create a performance tracker** at the start of the rule:

```typescript
export const rule = createRule<Options, MessageIds>({
  // ... rule metadata
  create(context, [options = {}]) {
    const performanceTracker = createPerformanceTracker(
      context.getFilename(),
      options.performance
    );
    
    try {
      // Rule implementation
      return {
        // ... rule visitors
      };
    } finally {
      stopTracking(performanceTracker);
    }
  },
});
```

2. **Track operations** that might be expensive:

```typescript
function someExpensiveOperation() {
  return trackOperation('operationName', () => {
    // Expensive operation here
  });
}
```

3. **Measure phases** of rule execution:

```typescript
function analyzeNode(node) {
  startPhase('analysis');
  try {
    // Analysis code
  } finally {
    endPhase('analysis');
  }
}
```

### 4. Handling Performance Limits

When a performance limit is exceeded, the tracker will throw a `PerformanceLimitExceededError`. Handle it gracefully:

```typescript
try {
  // Rule implementation
} catch (error) {
  if (error instanceof PerformanceLimitExceededError) {
    context.report({
      node,
      messageId: 'performanceLimitExceeded',
      data: {
        metric: error.metric,
        limit: error.limit,
        value: error.value,
      },
    });
    return {}; // Return empty visitor to stop further processing
  }
  throw error; // Re-throw other errors
}
```

### 5. Performance Testing

Add performance tests to ensure the rule remains efficient:

```typescript
describe('performance', () => {
  it('should handle large files efficiently', () => {
    const largeCode = generateLargeCode();
    const ruleTester = new RuleTester({
      parser: require.resolve('@typescript-eslint/parser'),
    });
    
    const start = process.hrtime.bigint();
    ruleTester.run('no-mutation-in-render', noMutationInRenderRule, {
      valid: [],
      invalid: [
        {
          code: largeCode,
          options: [{
            performance: {
              maxTimePerFile: 1000, // 1 second limit
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

## Best Practices

1. **Measure First**: Always profile the rule with realistic codebases to identify bottlenecks.
2. **Set Realistic Limits**: Configure default performance budgets based on real-world usage.
3. **Fail Fast**: Stop processing as soon as a performance limit is exceeded.
4. **Use Caching**: Cache expensive computations when possible.
5. **Be Selective**: Only track operations that are likely to be expensive.
6. **Document Performance Characteristics**: Add JSDoc comments explaining the time/space complexity of complex operations.

## Performance Tuning

1. **Optimize Hot Paths**: Focus on the most frequently executed code paths.
2. **Reduce AST Traversals**: Minimize the number of times you traverse the AST.
3. **Use Early Returns**: Exit early when possible to avoid unnecessary work.
4. **Lazy Evaluation**: Only compute what's needed when it's needed.
5. **Memory Management**: Be mindful of memory usage, especially with large codebases.

By following these guidelines, you can create ESLint rules that are both powerful and efficient, even on large codebases.
