# How to Integrate Performance Tracking in ESLint Rules

This guide explains how to integrate the performance tracking utility into your ESLint rules to monitor and enforce performance budgets.

## Prerequisites

- Your rule is using `@typescript-eslint/utils`
- You have access to the `performance.ts` utility

## Step 1: Import Required Utilities

At the top of your rule file, import the necessary performance tracking functions and types:

```typescript
import { createPerformanceTracker } from './utils/performance.js';
import { PerformanceOperations } from './utils/performance-constants.js';
import type { PerformanceBudget } from './utils/types.js';
```

## Step 2: Add Performance Budget to Rule Options

Extend your rule's options type to include the performance budget:

```typescript
interface Options {
  // Your existing options...
  performance?: PerformanceBudget | undefined;
}

// Example with React component options
interface Options {
  // Your existing options...
  performance?: PerformanceBudget;
}
```

## Step 3: Configure Default Options

In your rule's `defaultOptions`, include default performance settings. The performance tracker comes with sensible defaults, but you can override them as needed:

```typescript
import { DEFAULT_PERFORMANCE_BUDGET } from './utils/performance.js';

defaultOptions: [
  {
    // Your existing defaults...
    performance: {
      // All these are optional and will use defaults if not specified
      maxTime: 50, // ms
      maxNodes: 2000,
      maxMemory: 50 * 1024 * 1024, // 50MB
      enableMetrics: false, // Set to true to collect detailed metrics
      logMetrics: false, // Set to true to log metrics to console
      maxOperations: {
        // Override specific operation limits
        [PerformanceOperations.signalAccess]: 1000,
        [PerformanceOperations.signalCheck]: 500,
        [PerformanceOperations.effectCheck]: 500,
        // Add other operation limits as needed
      },
    },
  },
],
```

## Step 4: Initialize Performance Tracking

In your rule's `create` function, set up the performance tracker. The `createPerformanceTracker` function handles all the initialization automatically:

```typescript
create(context, [options = {}]) {
  // Set up performance tracking with a unique key for this rule
  const perfKey = 'your-rule-name';
  
  // Create the performance tracker
  const perf = createPerformanceTracker(
    perfKey, // Unique identifier for this rule
    options.performance, // Optional performance budget overrides
    context // ESLint rule context
  );

  // Your rule implementation...
  // Return your visitor methods here
  
  return {
    // Your visitor methods
  };
}
```

## Step 5: Track Operations and Handle Cleanup

Use the `perf` object to track operations in your rule's visitor methods. The performance tracker provides several methods for monitoring rule execution:

```typescript
return {
  '*'(node: TSESTree.Node) {
    perf.trackNode(node);
  },
  // Track node processing
  'Identifier'(node: TSESTree.Node) {    
    // Your rule logic...
    
    // Track specific operations with optional weight
    perf.trackOperation(PerformanceOperations.signalAccess, 1);
    
    // You can also track custom metrics
    perf.recordMetric('customMetric', 42);
  },
  
  // Track program exit for cleanup and reporting
  [`${AST_NODE_TYPES.Program}:exit`]() {
    // The performance tracker handles all cleanup automatically
    // Just call the Program:exit handler
    startPhase(perfKey, 'programExit');

    perf['Program:exit']();

    endPhase(perfKey, 'programExit');
  },
};
```

### Performance Tracking Methods

- `trackNode(node: TSESTree.Node)`: Call this for each node your rule processes
- `trackOperation(operation: string, count: number = 1)`: Track specific operations with an optional count
- `recordMetric<T>(name: string, value: T)`: Record custom metrics
- `startPhase(phaseName: string)`: Start a new performance phase
- `endPhase(phaseName: string)`: End a performance phase
- `getMetrics()`: Get current metrics (only available if metrics are enabled)

### Performance Budget Options

- `maxTime`: Maximum execution time in milliseconds (default: 50ms)
- `maxNodes`: Maximum number of AST nodes to process (default: 2000)
- `maxMemory`: Maximum memory usage in bytes (default: 50MB)
- `enableMetrics`: Whether to collect detailed metrics (default: false)
- `logMetrics`: Whether to log metrics to console (default: false)
- `maxOperations`: Operation-specific limits (see `PerformanceOperations` for available operations)

## Available Performance Operations

You can track various operations using these predefined constants from `PerformanceOperations`:

### React Hooks

- `hook:useEffect`: Tracking useEffect hook analysis
- `hook:useLayoutEffect`: Tracking useLayoutEffect hook analysis
- `hook:useCallback`: Tracking useCallback hook analysis
- `hook:useMemo`: Tracking useMemo hook analysis
- `hook:useImperativeHandle`: Tracking useImperativeHandle hook analysis
- `hook:effect`: Generic effect hook tracking
- `hook:computed`: Computed value hook tracking

### Signal Operations

- `signalImport:signal`: Tracking signal imports
- `signalImport:useSignal`: Tracking useSignal imports
- `signalHookFound:useSignal`: When a useSignal hook is found
- `signalHookFound:useComputed`: When a useComputed hook is found
- `signalHookFound:useSignalEffect`: When a useSignalEffect hook is found
- `signalHookFound:useSignalState`: When a useSignalState hook is found
- `signalHookFound:useSignalRef`: When a useSignalRef hook is found

### Component Analysis

- `reactComponentFunctionDeclarationProcessing`: Processing function declarations
- `reactComponentArrowFunctionDeclarationProcessing`: Processing arrow function components
- `reactComponentFunctionExpressionProcessing`: Processing function expressions
- `reactComponentArrowFunctionExpressionProcessing`: Processing arrow function expressions

### Code Analysis

- `fileAnalysis`: General file analysis phase
- `assignmentAnalysis`: Analysis of assignments
- `preImportAnalysis`: Pre-import analysis phase
- `variableCheck`: Variable validation checks
- `parameterCheck`: Parameter validation checks
- `reportingIssue`: When an issue is reported

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

1. **Set Conservative Defaults**
   - Start with the default limits and adjust based on your rule's needs
   - Consider the average file size and complexity in your codebase

   ```typescript
   const DEFAULT_PERFORMANCE_BUDGET: PerformanceBudget = {
     maxTime: 50, // ms
     maxNodes: 2000,
     maxMemory: 50 * 1024 * 1024, // 50MB
     enableMetrics: false,
     logMetrics: false,
     maxOperations: {
       [PerformanceOperations.signalAccess]: 1000,
       // Add other operation limits as needed
     },
   };
   ```

2. **Enable Metrics Selectively**
   - Only enable metrics collection when debugging performance issues
   - Use environment variables or rule options to control metrics collection

   ```typescript
   if (process.env.ENABLE_PERF_METRICS) {
     options.performance = {
       ...options.performance,
       enableMetrics: true,
       logMetrics: true
     };
   }
   ```

3. **Track Custom Operations**
   - Use `trackOperation` to monitor specific operations in your rule
   - Define custom operation types if needed in `performance-constants.ts`

   ```typescript
   // In your rule's visitor methods
   'CallExpression'(node) {
     perf.trackOperation(PerformanceOperations.signalAccess, 'signal-access', 1);
     // Your rule logic...
   }
   ```

4. **Handle Performance Limits Gracefully**
   - Catch `PerformanceLimitExceededError` to provide helpful feedback
   - Consider implementing a fallback behavior when limits are hit

   ```typescript
   try {
     // Your rule logic that might hit performance limits
   } catch (error) {
     if (error instanceof PerformanceLimitExceededError) {
       context.report({
         node,
         message: 'Rule processing stopped: ',
         data: {
           message: error.message,
         },
       });
       return {}; // Return empty visitor to stop further processing
     }
     throw error; // Re-throw other errors
   }
   ```

5. **Profile and Optimize**
   - Use the collected metrics to identify performance bottlenecks
   - Focus optimization efforts on the most expensive operations
   - Consider batching or early returns for common cases

## Advanced Usage

### Custom Operation Types

You can define custom operation types in `performance-constants.ts`:

```typescript
export const enum PerformanceOperations {
  // ... existing operations
  myCustomOperation = 'my-custom-operation',
  anotherOperation = 'another-operation',
}
```

### Memory Usage Tracking

The performance tracker can monitor memory usage during rule execution:

```typescript
// At the start of your rule
startPhase(perfKey, 'my-rule-processing');

// During processing
const memoryUsage = process.memoryUsage();
recordMetric(perfKey, 'heapUsed', memoryUsage.heapUsed);

// At the end
endPhase(perfKey, 'my-rule-processing');
```

### Custom Metrics Collection

You can collect custom metrics using the `recordMetric` function:

```typescript
// Record a simple metric
recordMetric(perfKey, 'nodesProcessed', nodeCount);

// Record timing information
const startTime = Date.now();
// ... do work ...
recordMetric(perfKey, 'processingTime', Date.now() - startTime);
```

## Troubleshooting

### Performance Issues

If your rule is hitting performance limits:

1. Check which limit is being exceeded using the metrics
2. Consider optimizing expensive operations
3. Increase limits only if absolutely necessary
4. Add more granular operation tracking to identify hotspots

### Memory Leaks

If you notice memory usage growing unexpectedly:

1. Check for closures capturing large objects
2. Ensure you're not holding references to AST nodes
3. Use the memory metrics to track heap usage

## Example Implementation

Here's a complete example of a rule with performance tracking:

```typescript
import { ESLintUtils } from '@typescript-eslint/utils';
import {
  createPerformanceTracker,
  startTracking,
  stopTracking,
  DEFAULT_PERFORMANCE_BUDGET,
  PerformanceOperations,
  type PerformanceBudget,
} from './utils/performance';

const createRule = ESLintUtils.RuleCreator((name) => `https://example.com/rule/${name}`);

export const rule = createRule({
  name: 'my-rule',
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Example rule with performance tracking',
    },
    // ... other meta
  },
  defaultOptions: [
    {
      performance: {
        ...DEFAULT_PERFORMANCE_BUDGET,
        maxTime: 100, // Increase time limit for this rule
      },
    },
  ],
  create(context, [options]) {
    const perf = createPerformanceTracker('my-rule', options.performance, context);

    return {
      [`${AST_NODE_TYPES.CallExpression}`](node) {
        perf.trackNode(node);
        perf.trackOperation(PerformanceOperations.signalAccess, 'call-expression', 1);
        
        // Your rule logic...
      },
      [`${AST_NODE_TYPES.Program}:exit`]() {
        perf['Program:exit']();
      },
    };
  },
});
```
