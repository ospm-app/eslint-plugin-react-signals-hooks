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
| `signalCheck` | Number of signal property accesses | 1000 | Increase if you have many signal accesses |
| `signalUpdate` | Number of signal updates | 500 | For batch operations with many updates |
| `signalCheck` | Signal type checks | 200 | Large components with many signals |
| `nestedPropertyCheck` | Deep property access checks | 500 | Complex nested objects |
| `identifierResolution` | Variable/function lookups | 1000 | Code with many imports/variables |
| `scopeLookup` | Scope chain traversals | 1000 | Deeply nested scopes |
| `typeCheck` | Type checks | 500 | Heavy TypeScript usage |
| `componentCheck` | Component detections | 200 | Many components in one file |
| `hookCheck` | Hook usage validations | 200 | Custom hooks or many hooks |
| `effectCheck` | Effect validations | 300 | Many effects |
| `batchAnalysis` | Batch operation analysis | 200 | Heavy use of batch updates |

## Tuning Recommendations

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
            "SIGNAL_ACCESS": 2000,
            "IDENTIFIER_RESOLUTION": 2000,
            "SCOPE_LOOKUP": 2000
          }
        }
      }
    ]
  }
}
```

### For Development

```json
{
  "rules": {
    "react-signals-hooks/no-mutation-in-render": [
      "warn",
      {
        "performance": {
          "enableMetrics": true,
          "logMetrics": true
        }
      }
    ]
  }
}
```

## Common Performance Issues

1. **Slow Analysis**
   - Symptom: Linting takes too long
   - Solution: Increase `maxTime` and `maxNodes`

2. **High Memory Usage**
   - Symptom: Process runs out of memory
   - Solution: Increase `maxMemory` or optimize rule configuration

3. **False Positives**
   - Symptom: Rules miss violations in large files
   - Solution: Increase operation limits for the specific checks

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
