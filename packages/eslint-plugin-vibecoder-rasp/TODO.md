# Additional Strict React Rules

## State Management

### Single Source of Truth

- [x] Enforce state colocation (state should be as close as possible to where it's used) - Tests added in `state-colocation.test.tsx`
- [x] Prevent prop drilling beyond a certain depth (configurable, default: 3) - Tests added in `no-prop-drilling.test.tsx`
- [x] Require derived state to use `useMemo` or `computed` (signals) - Tests added in `derived-state-memo.test.tsx`
- [x] Prevent direct state mutations (enforce immutability) - Tests added in `no-state-mutation.test.tsx`
- [ ] Enforce proper state initialization (no undefined state without defaults)

## Effects and Side Effects

### Effect Cleanup

- [x] Require cleanup for all effects that add event listeners, timeouts, or subscriptions - Tests added in `require-cleanup.test.tsx`
- [ ] Enforce proper dependency arrays in `useEffect` and `useCallback`
- [ ] Prevent missing dependencies in effect hooks
- [ ] Enforce stable references for effect dependencies

## Component Composition

### Component Interface

- [ ] Enforce explicit prop types for all components
- [ ] Require default values for optional props
- [ ] Enforce prop destructuring in function parameters
- [ ] Prevent prop spreading in components (`<Component {...props} />`)
- [ ] Enforce consistent prop ordering (required props first, optional props after)
- Require default values for optional props
- Enforce prop destructuring in function parameters
- Prevent prop spreading in components (`<Component {...props} />`)
- Enforce consistent prop ordering (required props first, optional props after)

## Performance

### Rendering Optimizations

- Prevent inline function definitions in JSX props
- Enforce `key` prop usage in lists
- Prevent unnecessary re-renders with `React.memo` comparison functions
- Enforce `React.memo` for components that don't use context
- Prevent large component trees in render methods

## Error Handling

### Try/Catch Best Practices

- [ ] Require catch blocks for all try statements - Prevents unhandled promise rejections and runtime errors

## TypeScript Specific

### Type Safety

- Enforce strict null checks
- Forbid non-null assertions (`!`) with autofix that removes them
- Enforce explicit `| undefined` for optional types (except when default value is provided)

  ```typescript
  // Bad
  type A = {
    a?: string;
  }

  // Good
  type A = {
    a?: string | undefined;
  }
  ```

- Require explicit return types for all functions
- Prevent `any` and `unknown` types without explicit justification
- Enforce type imports (`import type { ... }`)
- Prevent `@ts-ignore` and `@ts-expect-error` without comments
- Enforce `globalThis` for timer functions (`setInterval`, `setTimeout`, `clearInterval`, `clearTimeout`)
  - Convert direct calls like `setTimeout()` to `globalThis.setTimeout()`
  - Ensure consistent usage across the codebase
  - Add autofix capability
- Enforce explicit `undefined` in function return types and check for missing returns
  - Highlight functions that don't specify `undefined` in their return type but have code paths that implicitly return undefined
  - Require explicit `| undefined` in the return type or ensure all code paths return a non-undefined value
  - Example:

    ```typescript
    // Bad - implicit undefined return
    function foo(): number {
      if (condition) return 1;
      // missing return
    }
    
    // Good - explicit undefined in return type
    function foo(): number | undefined {
      if (condition) return 1;
      // implicit return undefined is OK
    }
    
    // Also good - all code paths return a value
    function foo(): number {
      if (condition) return 1;
      return 2;
    }
    ```

- Enforce `typeof` for undefined checks with autofix
  - Convert direct `!== undefined` checks to use `typeof`
  - Example:

    ```typescript
    // Bad
    if (something !== undefined) {}

    // Good - using typeof for undefined checks
    if (typeof something !== 'undefined') {}
    ```

## Code Organization

### Import/Export

- Enforce consistent import order (React, third-party, internal)
- Prevent circular dependencies
- Enforce module boundaries
- Prevent barrel files from becoming too large
- Enforce file naming conventions

## Accessibility (a11y)

### a11y Rules

- Enforce alt text for images
- Require proper ARIA attributes
- Enforce keyboard navigation
- Prevent non-semantic HTML elements for interactive content
- Enforce proper heading hierarchy

## Error Boundaries

### Error Handling

- Require error boundaries around async components
- Enforce proper error handling in async operations
- Prevent unhandled promise rejections
- Enforce error logging

## Documentation

### JSDoc Requirements

- Enforce JSDoc for all exported functions/components
- Require prop type documentation
- Enforce example usage
- Document complex state logic
- Document side effects

## Code Quality

### Syntax Validation

- [ ] Detect and fix broken if/for/while/switch statements with missing closing brackets
  - Should validate semantic code structure
  - Identify correct line and indentation for missing closing brackets
  - autofix
  - Should handle nested blocks and complex scopes
  - Must work with JSX and TypeScript syntax

## Styling

### CSS-in-JS

- Enforce consistent styling approach
- Prevent inline styles
- Enforce CSS variables usage
- Enforce consistent naming conventions
- Prevent complex nested selectors

## Hooks

### Custom Hooks

- Enforce `use` prefix for custom hooks
- Require proper dependency arrays
- Enforce rules of hooks
- Prevent conditional hook calls
- Enforce hook dependencies in custom hooks

## Configuration Autofix

### TypeScript Config

- [ ] Autofix TypeScript configuration
  - [ ] For latest and strictest tsconfig.json based on TypeScript version in package.json
  - [ ] For root package in monorepo
  - [ ] For library package in monorepo
  - [ ] For library package in root repo
  - [ ] For private project in root repo
  - [ ] For private project in root repo of monorepo
  - [ ] For private project in monorepo
  - [ ] For CJS build
  - [ ] For ESM build
  - [ ] For types build
  - [ ] For testing

### ESLint Config

- [ ] Autofix ESLint configuration
  - [ ] For ESLint 9 | 8.57.1
  - [ ] Support for different file formats:
    - [ ] CJS
    - [ ] MJS
    - [ ] JS
    - [ ] TS
  - [ ] For different project types:
    - [ ] Frontend library
    - [ ] Backend library
    - [ ] Cross-platform library
    - [ ] React frontend
    - [ ] SolidJS frontend
    - [ ] Svelte frontend
    - [ ] React Router frontend
    - [ ] React Native frontend
    - [ ] Frontend project
    - [ ] Backend project

## Internationalization (i18n)

### Translation

- Enforce usage of translation functions
- Prevent hardcoded strings in JSX
- Enforce translation keys naming conventions
- Prevent missing translations

## Security

### XSS Protection

- Enforce proper escaping of dynamic content
- Prevent `dangerouslySetInnerHTML` without sanitization
- Enforce secure URL protocols
- Prevent `eval` and `new Function`
- Enforce Content Security Policy (CSP) compatible code

## Bundle Size

### Code Splitting

- Enforce dynamic imports for large components
- Prevent large bundle sizes
- Enforce code splitting for routes
- Prevent duplicate dependencies
- Enforce tree-shaking friendly imports

## Development Experience

### Developer Ergonomics

- [ ] Add rule to merge imports from the same file (e.g., combine `import { A } from 'x'` and `import { B } from 'x'` into `import { A, B } from 'x'`)

- Enforce meaningful component and variable names
- Prevent commented out code
- Enforce consistent error messages
- Prevent console.log in production code
- Enforce proper error boundaries

## Performance Monitoring

## Code Style

### Code Duplication

- [ ] Detect and prevent code duplication with the following patterns:
  - Two identical strings one directly under another, with empty lines, or with multiple empty lines in between
  - Two identical lines of code one directly after another
  - More than two identical blocks of code
  - Duplicate code blocks that are not in direct order
  - Configurable minimum token length for detection
  - Support for ignoring comments and specific patterns via configuration
  - Autofix capability to remove or consolidate duplicates
  - Option to ignore test files or specific file patterns

### Control Flow

- [ ] Require curly braces for all control statements (if, else, for, while, do-while)

  ```typescript
  // Bad
  if (a === b) return;
  
  // Good
  if (a === b) {
    return;
  }
  ```

- [ ] Require curly braces for switch case statements and enforce spacing between cases

  ```typescript
  // Bad
  switch (something) {
    case a: return 'a';
    case b: 
      return 'b';
    case c: return 'c';
    default: return 'default';
  }
  
  // Good
  switch (something) {
    case a: {
      return 'a';
    }
    
    case b: {
      return 'b';
    }
    
    // Fallthrough cases don't need spacing between them
    case c:
    case d: {
      return 'd';
    }
    
    default: {
      return 'default';
    }
  }
  ```

### Metrics

- Enforce performance monitoring for critical paths
- Prevent memory leaks
- Enforce proper cleanup in effects
- Prevent large component trees
- Enforce virtualization for large lists

## State Management (Advanced)

### State Updates

- Enforce batched state updates
- Prevent state updates during render
- Enforce proper state initialization
- Prevent derived state in render
- Enforce proper state reset patterns

## TypeScript (Advanced)

### Type Safety 2

- Enforce discriminated unions for state
- Prevent type assertions (`as`)
- Enforce proper type narrowing
- Prevent `any` in type definitions
- Enforce proper generic constraints

## Testing (Advanced)

### Integration Tests

- Enforce integration tests for component interactions
- Prevent testing implementation details
- Enforce proper test cleanup
- Prevent flaky tests
- Enforce proper test isolation

## Code Formatting

### Function Formatting

- Add rule to autofix brackets to functions with or without return
- Add rule to autoconvert const arrow functions to function declarations with autofix

## License Management

### Paid License Banner

- Add functionality to insert a paid advertising banner comment after 1000 files are checked
- Banner should be added to the top of every fixed file
- Include instructions for purchasing a $12/year license to remove the banner
- Track file checks in a persistent manner
- Make banner insertion configurable and disable-able via configuration
