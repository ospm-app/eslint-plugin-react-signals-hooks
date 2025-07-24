# Test Cases Documentation

This document outlines the test cases for all rules in the `@ospm/eslint-plugin-react-signals-hooks` package.

## Table of Contents

- [Test Cases Documentation](#test-cases-documentation)
  - [Table of Contents](#table-of-contents)
  - [Test Cases](#test-cases)
    - [require-use-signals](#require-use-signals)
    - [prefer-batch-updates](#prefer-batch-updates)
    - [prefer-signal-in-jsx](#prefer-signal-in-jsx)
    - [signal-variable-name](#signal-variable-name)
    - [prefer-signal-effect](#prefer-signal-effect)
    - [prefer-batch-for-multi-mutations](#prefer-batch-for-multi-mutations)
    - [warn-on-unnecessary-untracked](#warn-on-unnecessary-untracked)
    - [no-mutation-in-render](#no-mutation-in-render)
    - [no-non-signal-with-signal-suffix](#no-non-signal-with-signal-suffix)
    - [prefer-computed](#prefer-computed)
    - [prefer-for-over-map](#prefer-for-over-map)
    - [exhaustive-deps](#exhaustive-deps)
    - [no-mutation-in-render](#no-mutation-in-render-1)
    - [prefer-computed](#prefer-computed-1)
    - [prefer-for-over-map](#prefer-for-over-map-1)
    - [prefer-show-over-ternary](#prefer-show-over-ternary)
    - [prefer-signal-effect](#prefer-signal-effect-1)
    - [prefer-signal-in-jsx](#prefer-signal-in-jsx-1)
    - [signal-variable-name](#signal-variable-name-1)
  - [Planned Rules Test Cases](#planned-rules-test-cases)
    - [prefer-batch-for-multi-mutations](#prefer-batch-for-multi-mutations-1)
    - [warn-on-unnecessary-untracked](#warn-on-unnecessary-untracked-1)
    - [prefer-use-signal-over-use-state](#prefer-use-signal-over-use-state)
    - [no-non-signal-with-signal-suffix](#no-non-signal-with-signal-suffix-1)
    - [restrict-signal-locations](#restrict-signal-locations)
    - [require-use-signals Enhancement](#require-use-signals-enhancement)

## Test Cases

### require-use-signals

1. **Missing useSignals()**
   - Description: Component uses signal.value but is missing useSignals() hook
   - File: `tests/require-use-signals/require-use-signals.test.tsx`
   - Test Function: `TestMissingUseSignals`
   - Expected: Should trigger ESLint warning

2. **Direct Signal Usage**
   - Description: Component uses signal directly in JSX without useSignals()
   - File: `tests/require-use-signals/require-use-signals.test.tsx`
   - Test Function: `TestMissingUseSignalsDirectUsage`
   - Expected: Should trigger ESLint warning

3. **Correct useSignals() Usage**
   - Description: Component correctly includes useSignals() hook
   - File: `tests/require-use-signals/require-use-signals.test.tsx`
   - Test Function: `TestCorrectUseSignals`
   - Expected: No warnings

4. **No Signal Usage**
   - Description: Component doesn't use any signals
   - File: `tests/require-use-signals/require-use-signals.test.tsx`
   - Test Function: `TestNoSignalUsage`
   - Expected: No warnings

5. **Arrow Function Components**
   - Description: Test arrow function components with and without useSignals()
   - Files:
     - `TestArrowFunctionMissingUseSignals` (should warn)
     - `TestArrowFunctionCorrectUseSignals` (should not warn)

### prefer-batch-updates

1. **Multiple Signal Updates**
   - Description: Multiple signal updates without batching
   - File: `tests/prefer-batch-updates/prefer-batch-updates.test.tsx`
   - Test Function: `TestMultipleSignalUpdates`
   - Expected: Should trigger warning for multiple updates without batching

2. **Batched Signal Updates**
   - Description: Multiple signal updates within batch()
   - File: `tests/prefer-batch-updates/prefer-batch-updates.test.tsx`
   - Test Function: `TestBatchSignalUpdates`
   - Expected: No warnings (correct usage)

3. **Nested Signal Updates**
   - Description: Nested signal updates without batching
   - File: `tests/prefer-batch-updates/prefer-batch-updates.test.tsx`
   - Test Function: `TestNestedSignalUpdates`
   - Expected: Should trigger warning

4. **Single Signal Update**
   - Description: Single signal update (no batching needed)
   - File: `tests/prefer-batch-updates/prefer-batch-updates.test.tsx`
   - Test Function: `TestSingleSignalUpdate`
   - Expected: No warnings (single update doesn't need batching)

### prefer-signal-in-jsx

1. **Signal Value in JSX**
   - Description: Using .value in JSX
   - File: `tests/prefer-signal-in-jsx/prefer-signal-in-jsx.test.tsx`
   - Test Function: `TestSignalValueInJSX`
   - Expected: Should trigger warning

2. **Multiple Signal Values in JSX**
   - Description: Multiple .value usages in JSX
   - File: `tests/prefer-signal-in-jsx/prefer-signal-in-jsx.test.tsx`
   - Test Function: `TestMultipleSignalValuesInJSX`
   - Expected: Should trigger warnings for each .value usage

3. **Signal Value in JSX Attributes**
   - Description: Using .value in JSX attributes
   - File: `tests/prefer-signal-in-jsx/prefer-signal-in-jsx.test.tsx`
   - Test Function: `TestSignalValueInJSXAttribute`
   - Expected: Should trigger warning

4. **Correct Signal Usage in JSX**
   - Description: Using signals directly in JSX (without .value)
   - File: `tests/prefer-signal-in-jsx/prefer-signal-in-jsx.test.tsx`
   - Test Function: `TestCorrectSignalUsageInJSX`
   - Expected: No warnings

### signal-variable-name

1. **Valid Signal Names**
   - Description: Variables with valid signal names
   - File: `tests/signal-variable-name/signal-variable-name.test.tsx`
   - Test Functions: Various test cases with valid names
   - Expected: No warnings for valid names

2. **Invalid Signal Names**
   - Description: Variables with invalid signal names
   - File: `tests/signal-variable-name/signal-variable-name.test.tsx`
   - Test Functions: Various test cases with invalid names
   - Expected: Should trigger warnings for invalid names

### prefer-signal-effect

1. **useEffect with Signal Dependencies**
   - Description: Using useEffect with signal dependencies
   - File: `tests/prefer-signal-effect/prefer-signal-effect.test.tsx`
   - Test Function: `TestUseEffectWithSignalDeps`
   - Expected: Should suggest using effect()

2. **effect() with Signals**
   - Description: Correct usage of effect() with signals
   - File: `tests/prefer-signal-effect/prefer-signal-effect.test.tsx`
   - Test Function: `TestEffectWithSignals`
   - Expected: No warnings

### prefer-batch-for-multi-mutations

1. **Multiple Mutations**
   - Description: Multiple signal mutations without batching
   - File: `tests/prefer-batch-for-multi-mutations/prefer-batch-for-multi-mutations.test.tsx`
   - Test Function: `TestMultipleMutations`
   - Expected: Should suggest using batch()

2. **Batched Mutations**
   - Description: Multiple signal mutations within batch()
   - File: `tests/prefer-batch-for-multi-mutations/prefer-batch-for-multi-mutations.test.tsx`
   - Test Function: `TestBatchedMutations`
   - Expected: No warnings

### warn-on-unnecessary-untracked

1. **Unnecessary untracked()**
   - Description: Using untracked() where it's not needed
   - File: `tests/warn-on-unnecessary-untracked/warn-on-unnecessary-untracked.test.tsx`
   - Test Function: `TestUnnecessaryUntracked`
   - Expected: Should warn about unnecessary untracked()

2. **Necessary untracked()**
   - Description: Proper usage of untracked()
   - File: `tests/warn-on-unnecessary-untracked/warn-on-unnecessary-untracked.test.tsx`
   - Test Function: `TestNecessaryUntracked`
   - Expected: No warnings

### no-mutation-in-render

1. **Signal Mutation in Render**
   - Description: Mutating signals during render
   - File: `tests/no-mutation-in-render/no-mutation-in-render.test.tsx`
   - Test Function: `TestSignalMutationInRender`
   - Expected: Should warn about mutation during render

### no-non-signal-with-signal-suffix

1. **Incorrect Signal Suffix**
   - Description: Non-signal variables with 'Signal' suffix
   - File: `tests/no-non-signal-with-signal-suffix/no-non-signal-with-signal-suffix.test.tsx`
   - Test Function: `TestNonSignalWithSuffix`
   - Expected: Should warn about misleading suffix

### prefer-computed

1. **Derived State with useMemo**
   - Description: Using useMemo with signal dependencies
   - File: `tests/prefer-computed/prefer-computed.test.tsx`
   - Test Function: `TestUseMemoWithSignals`
   - Expected: Should suggest using computed()

### prefer-for-over-map

1. **Array.map with Signals**
   - Description: Using .map() with signal arrays
   - File: `tests/prefer-for-over-map/prefer-for-over-map.test.tsx`
   - Test Function: `TestArrayMapWithSignals`
   - Expected: Should suggest using <For> component

2. **Multiple Signals**
   - Description: Component uses multiple signals
   - File: `tests/require-use-signals/require-use-signals.test.tsx`
   - Test Function: `TestMultipleSignalsMissingUseSignals`
   - Expected: Should warn about missing useSignals()

3. **Signal in JSX Expression**
   - Description: Signal used in conditional JSX
   - File: `tests/require-use-signals/require-use-signals.test.tsx`
   - Test Function: `TestSignalInJSXMissingUseSignals`
   - Expected: Should warn about missing useSignals()

4. **Ignored Components**
   - Description: Components matching ignore patterns
   - File: `tests/require-use-signals/require-use-signals.test.tsx`
   - Test Function: `IgnoredComponent`
   - Expected: No warnings when component is in ignore list

5. **Non-Component Functions**
   - Description: Lowercase function names (not React components)
   - File: `tests/require-use-signals/require-use-signals.test.tsx`
   - Test Function: `notAComponent`
   - Expected: No warnings

### exhaustive-deps

1. **Missing Signal Dependency**
   - Description: Effect uses signal.value but doesn't list it in deps
   - File: `tests/exhaustive-deps/signal-deps.test.tsx`
   - Test Function: `TestMissingSignalDep`
   - Expected: Should warn about missing signal dependency

2. **Correct Signal Dependency**
   - Description: Effect correctly lists signal.value in deps
   - File: `tests/exhaustive-deps/signal-deps.test.tsx`
   - Test Function: `TestCorrectSignalDep`
   - Expected: No warnings

3. **Missing Signal Value Access**
   - Description: Effect uses signal.value but doesn't list it in deps
   - File: `tests/exhaustive-deps/signal-deps.test.tsx`
   - Test Function: `TestMissingSignalValueAccess`
   - Expected: Should warn about missing signal dependency

4. **Nested Signal Access**
   - Description: Effect uses nested signal access (e.g., signal.nested.value)
   - File: `tests/exhaustive-deps/nested-signal-access.test.tsx`
   - Expected: Should correctly track nested signal dependencies

5. **Signal in Callback**
   - Description: Effect uses a callback that accesses signals
   - File: `tests/exhaustive-deps/callback-signal-access.test.tsx`
   - Expected: Should track signal dependencies in callbacks

6. **Signal in Array Methods**
   - Description: Effect uses array methods that access signals
   - File: `tests/exhaustive-deps/array-methods.test.tsx`
   - Expected: Should track signal dependencies in array methods

7. **Deep Property Chains**
   - Description: Tests for deep property access
   - File: `tests/exhaustive-deps/deep-property-chains.test.tsx`
   - Expected: Should handle deep property chains

8. **Assignment Operations**
   - Description: Tests for assignment operations like countSignal.value++
   - File: `tests/exhaustive-deps/assignment-only.test.tsx`
   - Test Functions
     - `TestIncrementOperation`
     - `TestDecrementOperation`
     - `TestMultipleAssignmentOperations`
     - `TestAssignmentInDifferentScopes`
   - Expected: Should not trigger false positives for assignment operations

9. **Inline Arrow Functions in JSX Props**
   - Description: Tests for signal usage in inline arrow functions in JSX props
   - File: `tests/exhaustive-deps/inline-arrow-functions.test.tsx`
   - Expected: Should not trigger false positives for signal usage in inline arrow functions in props

10. **Signal in useCallback Dependencies**
    - Description: Tests for signal usage in useCallback dependency arrays
    - File: `tests/exhaustive-deps/use-callback-deps.test.tsx`
    - Expected: Should correctly track signal dependencies in useCallback hooks

11. **Signal in useMemo Dependencies**
    - Description: Tests for signal usage in useMemo dependency arrays
    - File: `tests/exhaustive-deps/use-memo-deps.test.tsx`
    - Expected: Should correctly track signal dependencies in useMemo hooks

12. **Complex Expressions**
    - Description: Tests for complex expressions involving signals
    - File: `tests/exhaustive-deps/complex-expressions.test.tsx`
    - Expected: Should correctly track signal dependencies in complex expressions

13. **Conditional Signal Access**
    - Description: Tests for conditional signal access patterns
    - File: `tests/exhaustive-deps/conditional-access.test.tsx`
    - Expected: Should correctly handle conditional signal access

14. **Signal in Custom Hooks**
    - Description: Tests for signal usage in custom hooks
    - File: `tests/exhaustive-deps/custom-hooks.test.tsx`
    - Expected: Should correctly track signal dependencies in custom hooks

15. **Ignore Comments**
    - Description: Tests for eslint-disable comments
    - File: `tests/exhaustive-deps/ignore-comments.test.tsx`
    - Expected: Should respect eslint-disable comments

16. **Imported Signals**
    - Description: Tests for signals imported from other files
    - File: `tests/exhaustive-deps/imported-signals.test.tsx`
    - Expected: Should handle imported signals correctly

17. **Nested Properties**
    - Description: Tests for nested property access
    - File: `tests/exhaustive-deps/nested-properties.test.tsx`
    - Expected: Should handle nested properties correctly

18. **useRef Usage**
    - Description: Tests for useRef usage with signals
    - File: `tests/exhaustive-deps/useref.test.tsx`
    - Expected: Should handle refs correctly

### no-mutation-in-render

1. **Direct Signal Mutation**
   - Description: Direct mutation of signal.value in render
   - Expected: Should warn about mutation during render

2. **Signal Mutation in Effect**
   - Description: Signal mutation inside useEffect
   - Expected: No warnings (allowed in effects)

3. **Signal Mutation in Event Handler**
   - Description: Signal mutation in event handler
   - Expected: No warnings (allowed in event handlers)

4. **Nested Signal Mutation**
   - Description: Nested signal access and mutation
   - Expected: Should detect and warn about mutations

5. **Signal Initialization**
   - Description: Signal initialization with function
   - Expected: Should not warn about initialization

### prefer-computed

1. **useMemo with Signal Dependencies**
   - Description: useMemo with signal dependencies
   - Expected: Should suggest using computed()

2. **useMemo with Mixed Dependencies**
   - Description: useMemo with both signal and non-signal deps
   - Expected: Should handle mixed dependencies appropriately

3. **Computed with Complex Expressions**
   - Description: Complex expressions in useMemo
   - Expected: Should suggest appropriate computed() usage

### prefer-for-over-map

1. **Array.map with Signals**
   - Description: Using .map() with signal arrays
   - Expected: Should suggest using `For` component

2. **Nested .map()**
   - Description: Nested .map() calls
   - Expected: Should handle nested mappings

3. **Key Prop Handling**
   - Description: .map() with proper key prop
   - Expected: Should still suggest `For` with proper key handling

### prefer-show-over-ternary

1. **Simple Ternary with Signal**
   - Description: Ternary with signal condition
   - Expected: Should suggest using `Show` component

2. **Nested Ternaries**
   - Description: Nested ternary expressions
   - Expected: Should handle nested conditions

3. **Complex Conditions**
   - Description: Complex logical expressions
   - Expected: Should suggest appropriate `Show` usage

### prefer-signal-effect

1. **useEffect with Signal Dependencies**
   - Description: useEffect that only depends on signals
   - Expected: Should suggest using effect() or useSignalEffect()

2. **Mixed Dependencies**
   - Description: useEffect with both signal and non-signal deps
   - Expected: Should handle mixed dependencies appropriately

3. **Cleanup Functions**
   - Description: useEffect with cleanup
   - Expected: Should properly handle cleanup functions

### prefer-signal-in-jsx

1. **Direct Signal Usage**
   - Description: Using signal directly in JSX
   - Expected: Should allow direct usage (no .value needed)

2. **Signal Property Access**
   - Description: Accessing signal properties in JSX
   - Expected: Should handle property access correctly

3. **Template Literals**
   - Description: Signals in template literals
   - Expected: Should handle template literals correctly

### signal-variable-name

1. **Signal Naming Convention**
   - Description: Variables holding signals should follow naming convention
   - Expected: Should enforce signal naming (e.g., `somethingSignal`)

2. **Signal Creation**
   - Description: Variables created with signal()
   - Expected: Should enforce naming for signal creations

3. **useSignal Hook**
   - Description: Variables from useSignal()
   - Expected: Should enforce naming for useSignal results

4. **TypeScript Type Annotations**
   - Description: Variables with Signal type annotations
   - Expected: Should check type annotations for signal types

## Planned Rules Test Cases

### prefer-batch-for-multi-mutations

1. **Multiple Mutations in Event Handler**
   - Description: Multiple signal mutations in a single event handler
   - Expected: Should suggest wrapping in `batch()`
   - Example:

     ```typescript
     // Should warn
     const handleClick = () => {
       count.value++;
       total.value += count.value;
     };
     ```

2. **Mutations in Different Branches**
   - Description: Signal mutations in different conditional branches
   - Expected: Should suggest batching even when not in the same code path
   - Example:

     ```typescript
     // Should warn
     const update = (increment) => {
       if (increment) {
         count.value++;
       } else {
         total.value += count.value;
       }
     };
     ```

3. **Nested Scopes**
   - Description: Signal mutations in nested scopes
   - Expected: Should detect mutations across nested scopes
   - Configuration: `{ "includeNestedScopes": true }`

4. **Minimum Mutations Threshold**
   - Description: Respects minimum mutations configuration
   - Configuration: `{ "minMutations": 3 }`
   - Expected: Only warns when mutations >= 3

### warn-on-unnecessary-untracked

1. **Unnecessary .peek() in Render**
   - Description: .peek() used in render without need
   - Expected: Should warn about unnecessary .peek()
   - Example:

     ```typescript
     // Should warn
     function Component() {
       return <div>{count.peek()}</div>;
     }
     ```

2. **Allowed .peek() in Effects**
   - Description: .peek() used to prevent effect loops
   - Expected: Should not warn when used for signal writes
   - Example:

     ```typescript
     // Should not warn
     effect(() => {
       if (count.value > 5) {
         anotherSignal.value = count.peek();
       }
     });
     ```

3. **Untracked in Computed**
   - Description: untracked() used in computed context
   - Expected: Should warn about unnecessary untracked()
   - Configuration: `{ "allowInEffects": false }`

### prefer-use-signal-over-use-state

1. **Simple useState Conversion**
   - Description: Basic useState with primitive value
   - Expected: Should suggest useSignal
   - Example:

     ```typescript
     // Should suggest useSignal
     const [count, setCount] = useState(0);
     ```

2. **Complex Initializer**
   - Description: useState with complex initializer
   - Expected: Should respect ignoreComplexInitializers
   - Configuration: `{ "ignoreComplexInitializers": true }`

3. **Destructured Setter**
   - Description: useState with destructured setter
   - Expected: Should handle setter renaming
   - Example:

     ```typescript
     // Should handle setCount renaming
     const [count, updateCount] = useState(0);
     ```

### no-non-signal-with-signal-suffix

1. **Variable Naming**
   - Description: Variable with Signal suffix but not a signal
   - Expected: Should warn about misleading name
   - Example:

     ```typescript
     // Should warn
     const userSignal = { name: 'test' };
     ```

2. **Function Parameters**
   - Description: Function parameter with Signal suffix
   - Expected: Should check parameter types
   - Configuration: `{ "ignorePattern": "^_" }`

### restrict-signal-locations

1. **Signal in Component**
   - Description: signal() called in component body
   - Expected: Should warn about signal creation in components
   - Example:

     ```typescript
     // Should warn
     function Component() {
       const count = signal(0);
       return <div>{count}</div>;
     }
     ```

2. **Allowed Directory**
   - Description: signal() in allowed directory
   - Expected: Should not warn in configured directories
   - Configuration: `{ "allowedDirs": ["src/signals"] }`

3. **Computed in Component**
   - Description: computed() in component
   - Expected: Should allow when configured
   - Configuration: `{ "allowComputedInComponents": true }`

### require-use-signals Enhancement

1. **Auto-import**
   - Description: Missing useSignals import
   - Expected: Should auto-import useSignals
   - Configuration: `{ "autoImport": true }`

2. **Try/Finally Wrapping**
   - Description: Component with signal usage
   - Expected: Should wrap in try/finally with store.f()
   - Example:

     ```typescript
     // Should transform to use try/finally
     function Component() {
       return <div>{signal.value}</div>;
     }
     ```

3. **Memo Wrapping**
   - Description: Component without memo
   - Expected: Should wrap with memo when autoMemo enabled
   - Configuration: `{ "autoMemo": true }`

---

This document will be updated as new test cases are added or existing ones are modified.
