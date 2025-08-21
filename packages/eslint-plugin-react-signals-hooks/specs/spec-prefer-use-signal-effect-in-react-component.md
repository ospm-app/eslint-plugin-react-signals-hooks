# Rule Specification: prefer-use-signal-effect-in-react-component

## Overview

This rule enforces the use of `useSignalEffect()` instead of `effect()` inside React components to ensure proper integration with React's lifecycle and avoid potential issues with effect cleanup.

## Rule Details

### Problem

Using `effect()` directly inside React components can lead to:

- Effects not being properly cleaned up when components unmount
- Effects running at inappropriate times in React's lifecycle
- Potential memory leaks and stale closures

### Solution

Use `useSignalEffect()` which properly integrates with React's component lifecycle and ensures effects are cleaned up appropriately.

## Examples

### ❌ Incorrect

```tsx
import { signal, effect } from '@preact/signals-react';

function MyComponent() {
  const count = signal(0);
  
  // ❌ Effect not integrated with React lifecycle
  effect(() => {
    console.log('Count changed:', count.value);
  });
  
  return <div>{count.value}</div>;
}

// ❌ In arrow function component
const AnotherComponent = () => {
  const data = signal(null);
  
  // ❌ Effect not integrated with React lifecycle
  effect(() => {
    if (data.value) {
      document.title = `Data: ${data.value.name}`;
    }
  });
  
  return <span>{data.value?.name}</span>;
};
```

### ✅ Correct

```tsx
import { signal, useSignalEffect, effect } from '@preact/signals-react';

function MyComponent() {
  const count = signal(0);
  
  // ✅ Properly integrated with React lifecycle
  useSignalEffect(() => {
    console.log('Count changed:', count.value);
  });
  
  return <div>{count.value}</div>;
}

// ✅ In arrow function component
const AnotherComponent = () => {
  const data = signal(null);
  
  // ✅ Properly integrated with React lifecycle
  useSignalEffect(() => {
    if (data.value) {
      document.title = `Data: ${data.value.name}`;
    }
  });
  
  return <span>{data.value?.name}</span>;
};

// ✅ Outside component scope - effect() is fine
const globalCount = signal(0);
effect(() => {
  console.log('Global count:', globalCount.value);
});
```

### ✅ With cleanup

```tsx
import { useSignalEffect, signal } from '@preact/signals-react';

function TimerComponent() {
  const isActive = signal(false);
  
  // ✅ Cleanup properly handled by useSignalEffect
  useSignalEffect(() => {
    if (!isActive.value) return;
    
    const timer = setInterval(() => {
      console.log('Timer tick');
    }, 1000);
    
    return () => clearInterval(timer);
  });
  
  return <button onClick={() => (isActive.value = !isActive.value)}>
    {isActive.value ? 'Stop' : 'Start'} Timer
  </button>;
}
```

## Rule Configuration

```json
{
  "rules": {
    "react-signals-hooks/prefer-use-signal-effect-in-react-component": "error"
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

2. **Find effect() calls**: Look for CallExpression nodes where:
   - Callee is Identifier with name "effect"
   - Or callee is MemberExpression like "Signals.effect"

3. **Check scope**: Verify the effect() call is within a React component body

### Auto-fix

The rule should provide an auto-fix that:

1. Replaces `effect(` with `useSignalEffect(`
2. Adds `useSignalEffect` import if not present
3. Removes `effect` import if no longer used

### Error Messages

- `preferUseSignalEffectInComponent`: "Use `useSignalEffect()` instead of `effect()` inside React components to ensure proper lifecycle integration"
- `suggestUseSignalEffect`: "Replace `effect()` with `useSignalEffect()`"
- `addUseSignalEffectImport`: "Add `useSignalEffect` import from @preact/signals-react"

## Edge Cases

1. **Nested functions**: Only flag effect() in the direct component body, not in nested functions or event handlers
2. **Conditional effects**: Handle effect() calls inside if statements or other control flow
3. **Mixed imports**: Handle cases where both effect and useSignalEffect are imported
4. **Namespace imports**: Handle `import * as Signals from '@preact/signals-react'`
5. **Effect with cleanup**: Preserve cleanup functions when converting
6. **Module scope allowed**: Do not flag `effect()` created at module scope (outside components)

## Related Rules

- `prefer-signal-effect`: Encourages effect over useEffect for signal dependencies
- `no-signal-assignment-in-effect`: Prevents signal mutations in effects
