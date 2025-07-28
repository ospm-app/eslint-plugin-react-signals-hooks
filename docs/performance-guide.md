# Performance Optimization Guide for ESLint Rules

This guide provides best practices and patterns for implementing high-performance ESLint rules, based on the patterns used in this codebase.

## Table of Contents

- [Performance Optimization Guide for ESLint Rules](#performance-optimization-guide-for-eslint-rules)
  - [Table of Contents](#table-of-contents)
  - [Performance Budget](#performance-budget)
  - [Performance Tracking](#performance-tracking)
    - [1. Initialize Performance Tracking](#1-initialize-performance-tracking)
    - [2. Set Up Rule with Performance Tracking](#2-set-up-rule-with-performance-tracking)
  - [Rule Structure](#rule-structure)
    - [1. Node Counting and Early Exit](#1-node-counting-and-early-exit)
    - [2. Track Operations](#2-track-operations)
  - [Optimization Techniques](#optimization-techniques)
    - [1. Early Returns](#1-early-returns)
    - [2. Cache Results](#2-cache-results)
    - [3. Selective Visitor Implementation](#3-selective-visitor-implementation)
  - [Common Pitfalls](#common-pitfalls)
  - [Performance Testing](#performance-testing)
  - [Conclusion](#conclusion)

## Performance Budget

Each rule should define a performance budget to prevent excessive resource usage. The default budget is provided in `DEFAULT_PERFORMANCE_BUDGET`:

```typescript
const DEFAULT_PERFORMANCE_BUDGET = {
  maxNodeCount: 10_000, // Maximum number of nodes to process
  maxNodeCountPerRun: 1_000, // Maximum nodes per run
  maxFixCount: 100, // Maximum number of fixes per run
  maxFixCountPerRun: 10, // Maximum fixes per run
  maxFixIterations: 5, // Maximum fix iterations
  maxFixTimeMs: 1000, // Maximum time spent on fixes (ms)
  maxTotalTimeMs: 5000, // Maximum total time (ms)
  enableMetrics: false, // Enable detailed metrics
};
```

## Performance Tracking

### 1. Initialize Performance Tracking

Start by importing the necessary utilities:

```typescript
import {
  createPerformanceTracker,
  trackOperation,
  startPhase,
  endPhase,
  stopTracking,
  startTracking,
  DEFAULT_PERFORMANCE_BUDGET,
} from './utils/performance';
import { PerformanceOperations } from './utils/performance-constants';
```

### 2. Set Up Rule with Performance Tracking

In your rule's `create` function, initialize performance tracking:

```typescript
create(context, [option]): ESLintUtils.RuleListener {
  const perfKey = `${ruleName}:${context.filename}`;
  
  // Start performance tracking phase
  startPhase(perfKey, 'rule-init');
  
  // Create performance tracker with options
  const perf = createPerformanceTracker(perfKey, option.performance, context);
  
  // Enable metrics if specified
  if (option.performance?.enableMetrics === true) {
    startTracking(context, perfKey, option.performance, ruleName);
  }

  // Track rule initialization
  recordMetric(perfKey, 'config', {
    performance: {
      enableMetrics: option.performance.enableMetrics,
      logMetrics: option.performance.logMetrics,
    },
  });
  
  // Track operations
  trackOperation(perfKey, PerformanceOperations.ruleInitialization);
  
  // ... rest of your rule implementation
  
  // End phase when done
  endPhase(perfKey, 'rule-init');
  
  return {
    // Your rule visitors
  };
}
```

## Rule Structure

### 1. Node Counting and Early Exit

Implement node counting to prevent excessive processing:

```typescript
let nodeCount = 0;

function shouldContinue(): boolean {
  nodeCount++;
  
  // Check if we've exceeded the node budget
  if (nodeCount > (option.performance?.maxNodeCount ?? DEFAULT_PERFORMANCE_BUDGET.maxNodeCount)) {
    context.report({
      node: context.sourceCode.ast,
      messageId: 'performanceLimitExceeded',
      data: {
        nodeCount,
        maxNodeCount: option.performance?.maxNodeCount ?? DEFAULT_PERFORMANCE_BUDGET.maxNodeCount,
      },
    });
    return false;
  }
  
  return true;
}
```

### 2. Track Operations

Use `trackOperation` to measure specific operations:

```typescript
// Track specific operations
trackOperation(perfKey, PerformanceOperations.signalDetection);

// Time a specific phase
startPhase(perfKey, 'signal-detection');
// ... operation to measure
endPhase(perfKey, 'signal-detection');
```

## Optimization Techniques

### 1. Early Returns

Use early returns to skip unnecessary processing:

```typescript
if (!shouldContinue()) {
  return;
}

// Only proceed if we're in a component or hook
if (!inComponent && !inHook) {
  return;
}
```

### 2. Cache Results

Cache expensive operations:

```typescript
// At the module level
const signalImportCache = new Map<string, boolean>();

// In your rule
function hasSignalImport(sourceCode: SourceCode): boolean {
  if (signalImportCache.has(sourceCode.text)) {
    return signalImportCache.get(sourceCode.text)!;
  }
  
  const hasImport = sourceCode.ast.body.some(node => 
    node.type === 'ImportDeclaration' &&
    node.source.value === '@preact/signals-react'
  );
  
  signalImportCache.set(sourceCode.text, hasImport);
  return hasImport;
}
```

### 3. Selective Visitor Implementation

Only implement the visitor methods you need:

```typescript
return {
  // Only implement necessary visitors
  'CallExpression': handleCallExpression,
  'VariableDeclarator': handleVariableDeclarator,
  // ... other visitors
};
```

## Common Pitfalls

1. **Excessive AST Traversal**: Avoid traversing the entire AST when possible. Use specific selectors to target only relevant nodes.

2. **Memory Leaks**: Clear caches and remove event listeners when they're no longer needed.

3. **Inefficient Fixes**: When providing fixes, ensure they're as minimal as possible and don't trigger additional linting passes unnecessarily.

4. **Blocking Operations**: Avoid synchronous operations that could block the main thread, especially when processing large codebases.

## Performance Testing

Test your rule's performance with various codebase sizes:

1. **Small Files**: Ensure the rule works correctly with small files.
2. **Large Files**: Test with large files to identify performance bottlenecks.
3. **Real-world Codebases**: Test with actual project code to ensure realistic performance.

Use the performance metrics to identify and optimize slow operations:

```typescript
// Enable detailed metrics
const options = {
  performance: {
    enableMetrics: true,
    // ... other performance options
  }
};
```

## Conclusion

By following these patterns and best practices, you can create ESLint rules that are both powerful and performant. Always profile your rules with realistic codebases to identify and address any performance issues early in development.
