# Implementation Plan for @ospm/eslint-plugin-react-signals-hooks

This document outlines the implementation plan for new rules to enhance the plugin's capabilities.

## 1. Performance and Update Optimization Rules

### 1.1 `prefer-batch-for-multi-mutations`

**Goal**: Detect multiple signal mutations in the same scope and suggest wrapping them in `batch()`.

**Implementation Steps**:

1. **AST Analysis**:
   - Identify signal value assignments (e.g., `signal.value = x` or `signal.value++`)
   - Track them within the same function/block scope
   - Count mutations per scope

2. **Configuration**:
   - `minMutations`: Minimum mutations to trigger the rule (default: 2)
   - `includeNestedScopes`: Whether to check nested scopes (default: true)

3. **Autofix**:
   - Wrap all mutations in the scope with `batch(() => { ... })`
   - Add import if not already present

4. **Test Cases**:
   - Multiple mutations in event handlers
   - Mutations in different branches
   - Nested scopes
   - With existing batch calls

### 1.2 `warn-on-unnecessary-untracked`

**Goal**: Warn when `untracked()` or `.peek()` is used unnecessarily in reactive contexts.

**Implementation Steps**:

1. **AST Analysis**:
   - Detect `untracked()` calls and `.peek()` method calls
   - Determine if they're in reactive contexts (component render, computed, etc.)
   - Allow usage in effects when writing to another signal based on its previous value

2. **Configuration**:
   - `allowInEffects`: Allow in `useSignalEffect` (default: true)
   - `allowInEventHandlers`: Allow in DOM event handlers (default: true)
   - `allowForSignalWrites`: Allow when used to prevent circular dependencies in effects (default: true)

3. **Test Cases**:
   - `.peek()` in render
   - `untracked()` in computed
   - Allowed usages in effects/events
   - Signal write patterns in effects using `.peek()`
   - Nested signal access patterns

## 2. Hook and Primitive Migration Rules

### 2.1 `prefer-use-signal-over-use-state`

**Goal**: Suggest `useSignal` for simple `useState` usages.

**Implementation Steps**:

1. **AST Analysis**:
   - Find `useState` calls with primitive initial values
   - Check for simple setter usage patterns

2. **Configuration**:
   - `ignoreComplexInitializers`: Skip non-primitive inits (default: true)
   - `ignoreDestructuring`: Skip when destructuring is used (default: false)

3. **Autofix**:
   - Convert `const [x, setX] = useState(0)` to `const x = useSignal(0)`
   - Update all setter calls to use `.value`

### 2.2 `prefer-use-signal-ref-over-use-ref`

**Goal**: Promote `useSignalRef` for reactive refs.

**Implementation Steps**:

1. **AST Analysis**:
   - Find `useRef` declarations
   - Check if `.current` is being read in reactive contexts

2. **Configuration**:
   - `enableAutofix`: Enable automatic conversion (default: true)

3. **Autofix**:
   - Convert `useRef` to `useSignalRef`
   - Add import if needed

## 3. Safety and Lifecycle Rules

### 3.1 `no-signal-creation-in-render`

**Goal**: Prevent signal creation in render to avoid bugs.

**Implementation Steps**:

1. **AST Analysis**:
   - Detect `signal()` calls in component bodies
   - Ignore `useSignal` calls when `allowUseSignal` is true

2. **Configuration**:
   - `allowUseSignal`: Allow `useSignal` (default: true)

3. **Test Cases**:
   - Direct `signal()` in render
   - `useSignal` in render
   - Signal creation in callbacks

### 3.2 `require-effect-cleanup`

**Goal**: Ensure effects have proper cleanup.

**Implementation Steps**:

1. **AST Analysis**:
   - Find `useSignalEffect` and `effect` calls
   - Analyze callback for side effects
   - Check for cleanup return

2. **Configuration**:
   - `ignoreSimpleLogs`: Skip console logs (default: true)
   - `requireCleanupFor`: Array of effect names to check (default: ['useSignalEffect', 'effect'])

## 4. Existing Rule Enhancements

### 4.1 `require-use-signals` Enhancement

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
   - `prefer-use-signal-ref-over-use-ref`
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
