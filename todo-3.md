# Strict React Component Rules Implementation Plan

## Component Definition Rules

1. **no-default-export-react-component**
   - Forbid default exports for React components
   - Enforce named exports for better code navigation and refactoring

2. **no-arrow-const-react-component**
   - Forbid arrow function components
   - Enforce regular function declarations for better debugging and naming

3. **no-export-without-memo**
   - Ensure all exported components are wrapped in `memo`
   - Exception: Components that accept children or have custom comparison functions

4. **no-wrap-in-memo-component**
   - Forbid direct usage of `memo(() => {})` and `memo(function ComponentName() {})`
   - Enforce separate function declaration and memoization pattern

## Naming Conventions

1. Function components must be prefixed with `F_`
   - Example: `function F_ComponentName()`
   - Autofix: Add `F_` prefix if missing

2. Memoized components should use the original name without `F_`
   - Example: `export const ComponentName: ComponentType<Props> = memo<Props>(F_ComponentName)`
   - Autofix: Remove `F_` prefix in memo wrapper if present

## Type System Rules

1. **Type Imports**
   - Auto-import `type { JSX } from 'react'` if JSX.Element is used
   - Auto-import `memo` from 'react' if not already imported

2. **Return Type Inference**
   - Auto-add return types to component functions:
     - `JSX.Element` if returns JSX
     - `null` if only returns null
     - `JSX.Element | null` for multiple return branches

3. **Props Management**
   - Forbid inline props types
   - Autofix: Extract to `type Props = {}`
   - If `Props` exists, increment suffix (Props1, Props2, etc.)

## Performance Optimization Rules

1. **Function Memoization**
   - Autofix: Wrap declared functions in component scope with `useCallback`
   - Only if they use props or local state
   - Handle dependency array generation

2. **Function Extraction**
   - Autofix: Extract arrow functions with local dependencies into `useCallback`
   - Example: `const handleClick = () => setCount(count + 1)` → `const handleClick = useCallback(() => setCount(count + 1), [count])`

3. **Function Hoisting**
   - Autofix: Extract pure arrow functions to file scope
   - Only if they don't use component props/state
   - Example: `const formatName = (name) => name.trim()` → Move outside component

4. **Value Memoization**
   - Autofix: Wrap objects/arrays in `useMemo`
   - Only if they use props or local state
   - Handle dependency array generation

5. **Value Extraction**
   - Autofix: Extract objects/arrays with local dependencies into `useMemo`
   - Example: `const user = { name, age: userAge }` → `const user = useMemo(() => ({ name, age: userAge }), [name, userAge])`

6. **Value Hoisting**
   - Autofix: Move static objects/arrays to file scope
   - Only if they don't use component props/state
   - Example: `const DEFAULT_OPTIONS = { size: 'medium' }` → Move outside component

7. **Dependency Analysis**
   - Detect and handle complex dependencies in callbacks and memoized values
   - Handle function dependencies correctly
   - Handle object/array destructuring in dependencies

## TypeScript-Specific Rules

1. **no-fc-type**
   - Forbid `FC` and `FunctionComponent` types
   - Autofix: Convert to direct props type
   - Add `children: ReactNode` to props if needed

2. **no-export-type-props**
   - Forbid exporting `Props` type
   - Autofix: Remove `export` keyword from Props type

3. **enforce-short-props-type**
   - Enforce short `Props` type name
   - Autofix: Rename all instances (in ComponentType<Props> and memo<Props>())

## File Organization

1. **no-more-than-one-exported-component-per-file**
   - Enforce single component per file
   - Autofix:
     - Create new file for the component
     - Move component and its dependencies
     - Create shared utility files for common code
     - Update imports in both files

## Implementation Notes

- All rules should have autofix capabilities where possible
- Provide clear error messages with suggestions
- Include documentation with examples for each rule
- Add tests for each rule covering various edge cases
- Consider performance impact of autofixes on large codebases

## Priority Order

1. Component definition and memoization rules
2. Type system and props management
3. Performance optimization rules
4. File organization rules

## Testing Strategy

- Test each rule in isolation
- Test rule interactions
- Test autofix functionality
- Test with various React patterns and TypeScript configurations
- Include tests for edge cases and complex scenarios
