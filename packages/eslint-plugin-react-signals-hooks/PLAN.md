# 📋 Implementation Plan for @ospm/eslint-plugin-react-signals-hooks

This document outlines the implementation status and plan for all rules in the plugin.

## 🔍 Current Status Overview

| Status | Rule | Spec | Tests | Implementation |
|--------|------|------|-------|----------------|
| ✅ | `exhaustive-deps` | ✅ Complete | ✅ Complete | ✅ Complete |
| ✅ | `no-mutation-in-render` | ✅ Complete | ✅ Complete | ✅ Complete |
| ✅ | `no-non-signal-with-signal-suffix` | ✅ Complete | ✅ Complete | ✅ Complete |
| ✅ | `no-signal-assignment-in-effect` | ✅ Complete | ✅ Complete | ✅ Complete |
| ✅ | `no-signal-creation-in-component` | ✅ Complete | ✅ Complete | ✅ Complete |
| ✅ | `prefer-batch-for-multi-mutations` | ✅ Complete | ✅ Complete | ✅ Complete |
| ✅ | `prefer-batch-updates` | ✅ Complete | ✅ Complete | ✅ Complete |
| ✅ | `prefer-computed` | ✅ Complete | ✅ Complete | ✅ Complete |
| ✅ | `prefer-for-over-map` | ✅ Complete | ✅ Complete | ✅ Complete |
| ✅ | `prefer-show-over-ternary` | ✅ Complete | ✅ Complete | ✅ Complete |
| ✅ | `prefer-signal-effect` | ✅ Complete | ✅ Complete | ✅ Complete |
| ✅ | `prefer-signal-in-jsx` | ✅ Complete | ✅ Complete | ✅ Complete |
| ✅ | `prefer-signal-methods` | ✅ Complete | ✅ Complete | ✅ Complete |
| ✅ | `prefer-signal-reads` | ✅ Complete | ✅ Complete | ✅ Complete |
| ✅ | `prefer-use-signal-over-use-state` | ✅ Complete | ✅ Complete | ✅ Complete |
| ✅ | `require-use-signals` | ✅ Complete | ✅ Complete | ✅ Complete |
| ✅ | `signal-variable-name` | ✅ Complete | ✅ Complete | ✅ Complete |
| ✅ | `warn-on-unnecessary-untracked` | ✅ Complete | ✅ Complete | ✅ Complete |

## 🚀 Performance and Update Optimization Rules

### 1.1 `prefer-batch-for-multi-mutations`

**Status**: ✅ Complete  
**Goal**: Detect multiple signal mutations in the same scope and suggest wrapping them in `batch()`.

**Implementation**:

- ✅ AST Analysis for signal assignments
- ✅ Configuration options
- ✅ Autofix implementation
- ✅ Comprehensive test coverage

### 1.2 `warn-on-unnecessary-untracked`

**Status**: ✅ Complete  
**Goal**: Warn when `untracked()` or `.peek()` is used unnecessarily in reactive contexts.

**Implementation**:

- ✅ Context-aware detection
- ✅ Configurable rules
- ✅ Test cases for all scenarios

## 🔄 Hook and Primitive Migration Rules

### 2.1 `prefer-use-signal-over-use-state`

**Status**: ✅ Complete  
**Goal**: Suggest `useSignal` for simple `useState` usages.

**Implementation**:

- ✅ State pattern detection
- ✅ Safe autofix implementation
- ✅ TypeScript support

## ⚠️ Safety and Lifecycle Rules

### 3.1 `no-signal-creation-in-component`

**Status**: ✅ Complete  
**Goal**: Prevent signal creation in render to avoid bugs.

### 3.2 `no-mutation-in-render`

**Status**: ✅ Complete  
**Goal**: Prevent direct signal mutations during render.

### 3.3 `no-signal-assignment-in-effect`

**Status**: ✅ Complete  
**Goal**: Prevent signal assignments in effects without proper dependencies.

## 📊 Signal Usage Patterns

### 4.1 `prefer-signal-methods`

**Status**: ✅ Complete  
**Goal**: Encourage using signal methods over direct property access.

### 4.2 `prefer-signal-reads`

**Status**: ✅ Complete  
**Goal**: Ensure proper signal reading patterns in reactive contexts.

## 🎯 Next Steps

1. **Documentation**:
   - [ ] Ensure all rules have complete documentation
   - [ ] Add examples for all configuration options
   - [ ] Create migration guides for common patterns

2. **Testing**:
   - [ ] Add edge case tests for all rules
   - [ ] Test with various TypeScript configurations
   - [ ] Verify compatibility with different React versions

3. **Performance**:
   - [ ] Benchmark rule execution time
   - [ ] Optimize complex rules if needed
   - [ ] Add performance tests

4. **Integration**:
   - [ ] Test with popular React codebases
   - [ ] Gather feedback from early adopters
   - [ ] Address any compatibility issues

## 📅 Version Planning

### v1.0.0 (Current)

- All core rules implemented and tested
- Basic documentation complete
- TypeScript support

### v1.1.0 (Planned)

- Performance optimizations
- Additional test coverage
- Enhanced documentation with examples

### v1.2.0 (Future)

- Advanced configuration options
- Additional rule presets
- IDE integration improvements

1. **AST Analysis**:
   - Find `useSignalEffect` and `effect` calls
   - Analyze callback for side effects
   - Check for cleanup return

2. **Configuration**:
   - `ignoreSimpleLogs`: Skip console logs (default: true)
   - `requireCleanupFor`: Array of effect names to check (default: ['useSignalEffect', 'effect'])

## 4. ✨ Existing Rule Enhancements

### 4.1 ✅ `require-use-signals`

**Goal**: Improve the existing rule to automatically add required imports and wrap component body in try/finally with proper cleanup.

**Implementation Steps**:

1. **AST Analysis**:
   - Detect React function components using signals
   - Check for existing `useSignals` hook usage
   - Verify if component is already memoized

2. **Autofix Improvements**:
   - Add import: `import { useSignals } from "@preact/signals-react/runtime"`
   - Add memo import if needed: `import { memo } from "react"`
   - Wrap component body in try/finally:

     ```typescript
     const store = useSignals(1);
     try {
       // Component JSX
     } finally {
       store.f();
     }
     ```

   - Wrap component with `memo` if not already wrapped
   - Preserve existing JSDoc and type annotations

3. **Configuration**:
   - `autoImport`: Enable/disable auto-import (default: true)
   - `autoMemo`: Enable/disable auto-memo (default: true)
   - `trackingType`: Type of tracking (1-3, default: 1)

4. **Test Cases**:
   - Components with existing imports
   - Components with existing memo
   - Components with TypeScript types
   - Components with JSDoc comments
   - Direct signal usage in JSX
   - Signal usage in conditional JSX
   - Signal usage in JSX attributes
   - Signal usage in JSX fragments
   - Signal usage in complex JSX expressions
   - Signal usage in JSX callbacks and event handlers
   - Signal usage in JSX ternary operations
   - Signal usage in arrow function components
   - Signal usage in class components
   - Signal usage in forwardRef components
   - Signal usage in memo components
   - Signal usage in lazy components
   - Signal usage in Suspense boundaries
   - Signal usage in Error Boundaries
   - Signal usage in Context Providers/Consumers
   - Signal usage in Portals
   - Signal usage in React.Fragment
   - Signal usage in React.createContext
   - Signal usage in React.forwardRef
   - Signal usage in React.memo
   - Signal usage in React.lazy
   - Signal usage in React.Suspense
   - Signal usage in React.ErrorBoundary
   - Signal usage in React.StrictMode
   - Signal usage in React.Profiler
   - Signal usage in React.unstable_* components
   - Signal usage in React.Children utilities
   - Signal usage in React.cloneElement
   - Signal usage in React.createElement
   - Signal usage in React.isValidElement
   - Signal usage in React.Children.map
   - Signal usage in React.Children.forEach
   - Signal usage in React.Children.count
   - Signal usage in React.Children.only
   - Signal usage in React.Children.toArray
   - Signal usage in React.useState
   - Signal usage in React.useEffect
   - Signal usage in React.useContext
   - Signal usage in React.useReducer
   - Signal usage in React.useCallback
   - Signal usage in React.useMemo
   - Signal usage in React.useRef
   - Signal usage in React.useImperativeHandle
   - Signal usage in React.useLayoutEffect
   - Signal usage in React.useDebugValue
   - Signal usage in React.useDeferredValue
   - Signal usage in React.useTransition
   - Signal usage in React.useId
   - Signal usage in React.useSyncExternalStore
   - Signal usage in React.useInsertionEffect
   - Signal usage in React.startTransition
   - Signal usage in React.use
   - Signal usage in React.cache
   - Signal usage in React.memo
   - Signal usage in React.forwardRef
   - Signal usage in React.lazy
   - Signal usage in React.Suspense
   - Signal usage in React.ErrorBoundary
   - Signal usage in React.StrictMode
   - Signal usage in React.Profiler
   - Signal usage in React.unstable_* components
   - Signal usage in React.Children utilities
   - Signal usage in React.cloneElement
   - Signal usage in React.createElement
   - Signal usage in React.isValidElement
   - Signal usage in React.Children.map
   - Signal usage in React.Children.forEach
   - Signal usage in React.Children.count
   - Signal usage in React.Children.only
   - Signal usage in React.Children.toArray
   - Nested components
   - Components with existing try/catch blocks

## 5. Code Quality and Naming Rules

### 4.1 `no-non-signal-with-signal-suffix`

**Goal**: Prevent variables that aren't signals from having names ending with "Signal" to avoid confusion.

**Implementation Steps**:

1. **AST Analysis**:
   - Find all variable declarations and function parameters
   - Check if they end with "Signal" (case-insensitive)
   - Verify if they are actual signal variables (from `useSignal`, `signal`, or `computed`)

2. **Configuration**:
   - `ignorePattern`: Regex pattern for variable names to ignore (default: `^_` for private variables)
   - `allowedNames`: Array of specific names to allow (default: `[]`)

3. **Test Cases**:
   - Variable declarations with Signal suffix
   - Function parameters with Signal suffix
   - Object properties with Signal suffix
   - Class fields with Signal suffix
   - Allowed patterns and names

### 4.2 `restrict-signal-locations`

**Goal**: Enforce that signals are only created in specific directories and not in React components.

**Implementation Steps**:

1. **AST Analysis**:
   - Detect React components (function/class components)
   - Find signal creations (`signal()`, `useSignal()`)
   - Check file location against allowed directories
   - Allow `computed()` in component scope

2. **Configuration**:
   - `allowedDirs`: Array of directories where signals can be created (default: `['signals', 'src/signals']`)
   - `allowComputedInComponents`: Allow `computed()` in components (default: `true`)
   - `checkImports`: Also check signal imports (default: `true`)

3. **Test Cases**:
   - Signal creation in allowed directories
   - Signal creation in disallowed directories
   - `computed()` usage in components
   - Signal imports from allowed/disallowed locations

## 5. Advanced Utility and Sync Rules

### 5.1 `prefer-use-live-signal-for-sync`

**Goal**: Replace manual sync patterns with `useLiveSignal`.

**Implementation Steps**:

1. **AST Analysis**:
   - Find `useSignal` + `useSignalEffect` patterns that sync values
   - Match source and target signals

2. **Configuration**:
   - `enableAutofix`: Enable automatic conversion (default: true)

3. **Autofix**:
   - Replace pattern with `useLiveSignal`
   - Add import if needed

## Implementation Order

1. **Phase 1 - Core Rules**:
   - `no-signal-creation-in-render`
   - `require-effect-cleanup`

2. **Phase 2 - Performance**:
   - `prefer-batch-for-multi-mutations`
   - `warn-on-unnecessary-untracked`

3. **Phase 3 - Code Quality**:
   - `no-non-signal-with-signal-suffix`
   - `restrict-signal-locations`

4. **Phase 4 - Migration Helpers**:
   - `prefer-use-signal-over-use-state`
   - `prefer-use-live-signal-for-sync`

## Testing Strategy

For each rule:

1. Unit tests for basic cases
2. Integration tests with React components
3. Test autofix functionality
4. Test TypeScript support
5. Test edge cases and false positives

## Documentation

For each rule, document:

- Purpose and benefits
- Configuration options
- Examples of incorrect/correct usage
- When to disable the rule
- Auto-fix availability
