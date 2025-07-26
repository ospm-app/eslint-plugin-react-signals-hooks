# How to Integrate Performance Tracking in ESLint Rules

This guide explains how to integrate the performance tracking utility into your ESLint rules to monitor and enforce performance budgets.

## Prerequisites

- Your rule is using `@typescript-eslint/utils`
- You have access to the `performance.ts` utility

## Step 1: Import Required Utilities

At the top of your rule file, import the necessary performance tracking functions and types:

```typescript
import {
  createPerformanceTracker,
  startTracking,
  type PerformanceBudget,
} from './utils/performance.js';
import { PerformanceOperations } from './utils/performance-constants.js';
```

## Step 2: Add Performance Budget to Rule Options

Extend your rule's options type to include the performance budget:

```typescript
interface Options {
  // Your existing options...
  performance?: PerformanceBudget | undefined;
}
```

## Step 3: Configure Default Options

In your rule's `defaultOptions`, include default performance settings:

```typescript
defaultOptions: [
  {
    // Your existing defaults...
    performance: {
      maxTime: 40, // ms
      maxNodes: 1000,
      maxMemory: 40 * 1024 * 1024, // 40MB
      enableMetrics: false,
      logMetrics: false,
      maxOperations: {
        [PerformanceOperations.signalAccess]: 500,
        // Add other operation limits as needed
      },
    },
  },
],
```

## Step 4: Initialize Performance Tracking

In your rule's `create` function, set up the performance tracker:

```typescript
create(context, [options = {}]) {
  // Set up performance tracking
  const perf = createPerformanceTracker<Options>(
    'your-rule-name',
    {
      maxTime: options.performance?.maxTime ?? 40,
      maxNodes: options.performance?.maxNodes ?? 1000,
      maxMemory: options.performance?.maxMemory ?? 40 * 1024 * 1024,
      maxOperations: {
        [PerformanceOperations.signalAccess]: 
          options.performance?.maxOperations?.[PerformanceOperations.signalAccess] ?? 500,
        // Add other operation limits with fallbacks
      },
      enableMetrics: options.performance?.enableMetrics ?? false,
      logMetrics: options.performance?.logMetrics ?? false,
    },
    context
  );

  // Enable detailed metrics if configured
  if (options.performance?.enableMetrics) {
    startTracking<Options>(
      context, 
      'your-rule-name',
      {
        maxTime: options.performance.maxTime,
        maxNodes: options.performance.maxNodes,
        maxMemory: options.performance.maxMemory,
        maxOperations: options.performance.maxOperations,
        enableMetrics: options.performance.enableMetrics,
        logMetrics: options.performance.logMetrics,
      }
    );
  }

  // Your rule implementation...
}
```

## Step 5: Track Operations

Use the `perf` object to track operations in your rule's visitor methods:

```typescript
return {
  // Track node processing
  'Identifier'(node) {
    perf.trackNode();
    
    // Your rule logic...
    
    // Track specific operations
    perf.trackOperation(PerformanceOperations.signalAccess, 'signal-access', 1);
  },
  
  // Track program exit for cleanup and reporting
  'Program:exit'() {
    perf['Program:exit']();
  },
};
```

## Step 6: Handle Performance Budgets

The performance tracker will automatically enforce the configured limits. If a limit is exceeded, it will throw a `PerformanceLimitExceededError`.

## Available Performance Operations

You can track various operations using these predefined constants from `PerformanceOperations`:

- `signalAccess`: Signal access operations
- `signalCheck`: Signal validation checks
- `effectCheck`: Effect hook validations
- `identifierResolution`: Identifier lookups
- `scopeLookup`: Scope traversal operations
- `typeCheck`: Type checking operations

## Configuration Options

### Performance Budget Options

- `maxTime`: Maximum execution time in milliseconds (default: 40ms)
- `maxNodes`: Maximum number of AST nodes to process (default: 1000)
- `maxMemory`: Maximum memory usage in bytes (default: 40MB)
- `enableMetrics`: Whether to collect detailed metrics (default: false)
- `logMetrics`: Whether to log metrics to console (default: false)
- `maxOperations`: Operation-specific limits

### Example Configuration

```json
{
  "rules": {
    "your-rule-name": [
      "error",
      {
        "performance": {
          "maxTime": 50,
          "maxNodes": 2000,
          "enableMetrics": true,
          "logMetrics": true,
          "maxOperations": {
            "signalAccess": 1000,
            "typeCheck": 500
          }
        }
      }
    ]
  }
}
```

## Best Practices

1. Set conservative default limits that work for most codebases
2. Enable metrics collection only when debugging performance issues
3. Use specific operation tracking to identify performance bottlenecks
4. Adjust limits based on your specific rule's complexity
5. Consider file size and complexity when setting operation limits
