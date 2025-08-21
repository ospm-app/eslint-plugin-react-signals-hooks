# Rule Specification: prefer-use-computed-in-react-component

## Overview

This rule enforces the use of `useComputed()` instead of `computed()` inside React components to prevent creating new computed signals on every render.

## Rule Details

### Problem

Using `computed()` directly inside React components creates a new computed signal on every render, which can lead to:

- Performance issues due to unnecessary signal recreation
- Memory leaks from accumulating signal instances
- Loss of memoization benefits

### Solution

Use `useComputed()` which properly manages the computed signal lifecycle within React components.

## Examples

### ❌ Incorrect

```tsx
import { signal, computed } from '@preact/signals-react';

function MyComponent() {
  const count = signal(0);
  
  // ❌ Creates new computed signal on every render
  const doubled = computed(() => count.value * 2);
  
  return <div>{doubled.value}</div>;
}

// ❌ In arrow function component
const AnotherComponent = () => {
  const items = signal([1, 2, 3]);
  
  // ❌ Creates new computed signal on every render
  const total = computed(() => items.value.reduce((a, b) => a + b, 0));
  
  return <span>{total.value}</span>;
};
```

### ✅ Correct

```tsx
import { signal, useComputed, computed } from '@preact/signals-react';

function MyComponent() {
  const count = signal(0);
  
  // ✅ Properly managed computed signal
  const doubled = useComputed(() => count.value * 2);
  
  return <div>{doubled.value}</div>;
}

// ✅ In arrow function component
const AnotherComponent = () => {
  const items = signal([1, 2, 3]);
  
  // ✅ Properly managed computed signal
  const total = useComputed(() => items.value.reduce((a, b) => a + b, 0));
  
  return <span>{total.value}</span>;
};

// ✅ Outside component scope - computed() is fine
const globalCount = signal(0);
const globalDoubled = computed(() => globalCount.value * 2);
```

## Rule Configuration

```json
{
  "rules": {
    "react-signals-hooks/prefer-use-computed-in-react-component": "error"
  }
}
```

### Options

```typescript
type Options = {
  // Performance tuning options
  performance?: {
    maxTime?: number;
    maxMemory?: number;
    maxNodes?: number;
    enableMetrics?: boolean;
    logMetrics?: boolean;
  };
}
```

## Implementation Details

### Detection Logic

1. **Identify React Components**: Functions that:
   - Start with uppercase letter (PascalCase)
   - Are function declarations or arrow function expressions
   - Are assigned to variables with PascalCase names

2. **Find computed() calls**: Look for CallExpression nodes where:
   - Callee is Identifier with name "computed"
   - Or callee is MemberExpression like "Signals.computed"

3. **Check scope**: Verify the computed() call is within a React component body

### Auto-fix

The rule should provide an auto-fix that:

1. Replaces `computed(` with `useComputed(`
2. Adds `useComputed` import if not present
3. Removes `computed` import if no longer used

### Error Messages

- `preferUseComputedInComponent`: "Use `useComputed()` instead of `computed()` inside React components to avoid creating new signals on every render"
- `suggestUseComputed`: "Replace `computed()` with `useComputed()`"
- `addUseComputedImport`: "Add `useComputed` import from @preact/signals-react"

## Edge Cases

1. **Nested functions**: Only flag computed() in the direct component body, not in nested functions
2. **Conditional computed**: Handle computed() calls inside if statements or other control flow
3. **Mixed imports**: Handle cases where both computed and useComputed are imported
4. **Namespace imports**: Handle `import * as Signals from '@preact/signals-react'`
5. **Module scope allowed**: Do not flag `computed()` created at module scope (outside components)

## Related Rules

- `prefer-computed`: Encourages computed over useMemo
- `no-signal-creation-in-component`: Prevents signal creation in components
