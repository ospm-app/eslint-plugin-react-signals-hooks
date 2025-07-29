# Performance Tuning Guide

This guide provides detailed information about performance tuning options available in the ESLint React Signals Hooks plugin.

## Performance Budget Options

### Global Performance Limits

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `maxTime` | `number` | `50` | Maximum execution time in milliseconds before the rule will abort analysis. Increase if you have large files. |
| `maxNodes` | `number` | `2000` | Maximum number of AST nodes to process. Increase for complex codebases. |
| `maxMemory` | `number` | `50 * 1024 * 1024` (50MB) | Maximum memory usage in bytes. Adjust based on your system resources. |
| `enableMetrics` | `boolean` | `false` | Enable detailed performance metrics collection. |
| `logMetrics` | `boolean` | `false` | Log performance metrics to console. Useful for debugging. |

### Operation-Specific Limits

These limits help prevent performance degradation on large codebases by capping expensive operations.

| Operation | Description | Default Limit | When to Adjust |
|-----------|-------------|---------------|----------------|
| `signalAccess` | Signal property accesses | 1000 | Code with many signal reads |
| `signalUpdate` | Signal updates | 500 | Batch operations with many updates |
| `signalCreation` | Signal creations | 200 | Many signal instantiations |
| `hookExecution` | Hook validations | 200 | Many hooks in components |
| `typeCheck` | Type checks | 500 | Heavy TypeScript usage |
| `scopeLookup` | Scope chain traversals | 1000 | Deeply nested scopes |
| `nodeProcessing` | AST node processing | 2000 | Large files with complex logic |
| `importCheck` | Import validations | 200 | Many imports or complex module graphs |
| `effectCheck` | Effect validations | 300 | Many effects in components |
| `batchAnalysis` | Batch operation analysis | 200 | Heavy use of batch updates |

## Performance Metrics Collection

When `enableMetrics` is `true`, the plugin collects detailed performance data including:

- **Phase Durations**: Time spent in different phases of rule execution
- **Operation Counts**: Number of times each operation was performed
- **Memory Usage**: Heap memory usage before and after analysis
- **Node Counts**: Number of AST nodes processed

### Available Phases

- `ruleInit`: Rule initialization
- `program-analysis`: Initial program analysis
- `import-check`: Import validation
- `signal-check`: Signal access validation
- `hook-check`: Hook usage validation
- `effect-check`: Effect validation
- `type-check`: Type checking
- `node-processing`: General AST node processing

## Configuration Examples

### For Large Codebases

```json
{
  "rules": {
    "react-signals-hooks/no-mutation-in-render": [
      "error",
      {
        "performance": {
          "maxTime": 100,
          "maxNodes": 5000,
          "maxMemory": 100 * 1024 * 1024,
          "maxOperations": {
            "signalAccess": 2000,
            "signalUpdate": 1500,
            "scopeLookup": 2000,
            "nodeProcessing": 5000
          }
        }
      }
    ]
  }
}
```

### For Development with Metrics

```json
{
  "rules": {
    "react-signals-hooks/no-mutation-in-render": [
      "warn",
      {
        "performance": {
          "enableMetrics": true,
          "logMetrics": true,
          "maxTime": 200,
          "maxNodes": 10000
        }
      }
    ]
  }
}
```

### For CI/CD Pipelines

```json
{
  "rules": {
    "react-signals-hooks/no-mutation-in-render": [
      "error",
      {
        "performance": {
          "enableMetrics": true,
          "logMetrics": false,
          "maxTime": 5000,
          "maxNodes": 10000,
          "maxMemory": 200 * 1024 * 1024
        }
      }
    ]
  }
}
```

## Performance Optimization Tips

1. **Analyze Performance Bottlenecks**
   - Enable metrics in development to identify slow operations
   - Look for operations with high counts or long durations
   - Focus optimization efforts on the most expensive operations

2. **Optimize Large Files**
   - Break down large components into smaller, focused components
   - Extract complex logic into custom hooks
   - Use memoization to prevent unnecessary recalculations

3. **Memory Management**
   - Monitor memory usage with `enableMetrics`
   - Increase `maxMemory` if needed, but investigate memory leaks first
   - Avoid creating large intermediate objects during analysis

## Troubleshooting Performance Issues

### Common Symptoms and Solutions

1. **Slow Analysis**
   - Symptom: Linting takes too long
   - Solution:
     - Increase `maxTime` and `maxNodes`
     - Check for expensive operations in metrics
     - Consider splitting large files

2. **High Memory Usage**
   - Symptom: Process runs out of memory
   - Solution:
     - Increase `maxMemory`
     - Look for memory leaks in custom rules
     - Optimize data structures

3. **Incomplete Analysis**
   - Symptom: Rules miss violations in large files
   - Solution:
     - Increase operation limits for specific checks
     - Check if any operations are hitting their limits in the metrics

## Best Practices

1. **Enable Metrics in CI**

   ```json
   {
     "performance": {
       "enableMetrics": true,
       "logMetrics": false
     }
   }
   ```

   Then collect and analyze metrics to identify bottlenecks.

2. **Use File Patterns**
   Apply different performance budgets based on file patterns:

   ```json
   {
     "overrides": [
       {
         "files": ["**/*.test.tsx"],
         "rules": {
           "react-signals-hooks/no-mutation-in-render": ["error", {
             "performance": {
               "maxTime": 100
             }
           }]
         }
       }
     ]
   }
   ```

3. **Monitor and Adjust**
   - Start with defaults
   - Monitor performance
   - Adjust limits as needed
   - Document any necessary overrides
