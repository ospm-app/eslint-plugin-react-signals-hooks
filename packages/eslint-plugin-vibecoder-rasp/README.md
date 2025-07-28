# eslint-plugin-vibecoder-rasp

[![npm version](https://img.shields.io/npm/v/eslint-plugin-vibecoder-rasp.svg)](https://www.npmjs.com/package/eslint-plugin-vibecoder-rasp)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

A comprehensive ESLint plugin for React applications using TypeScript, enforcing strict coding standards and best practices.

## Features

- **State Management**: Enforces patterns for state colocation, immutability, and proper state initialization
- **Effects and Side Effects**: Ensures proper cleanup and dependency management
- **Component Composition**: Promotes clean component interfaces with explicit prop types
- **Performance**: Includes rules to prevent common performance pitfalls
- **Type Safety**: Enforces strict TypeScript rules and type safety
- **Testing**: Encourages comprehensive testing practices
- **Accessibility**: Includes rules for better a11y

## Installation

```bash
npm install --save-dev eslint-plugin-vibecoder-rasp @typescript-eslint/parser typescript
```

## Usage

Add `vibecoder-rasp` to the plugins section of your `.eslintrc` configuration file:

```json
{
  "plugins": ["vibecoder-rasp"],
  "extends": [
    "plugin:vibecoder-rasp/recommended"
  ]
}
```

## Recommended Configuration

This plugin exports a `recommended` configuration that enforces good practices. To enable it, add:

```json
{
  "extends": ["plugin:vibecoder-rasp/recommended"]
}
```

## Rules

### React Namespace Usage

- **no-react-namespace**: Enforces using non-namespaced React types and hooks. This rule promotes cleaner imports and better tree-shaking.
  - ❌ `React.useState`, `React.useEffect`, `React.ReactNode`, `React.JSX.Element`
  - ✅ `useState`, `useEffect`, `ReactNode`, `JSX.Element`
  - autofix: yes

### State Management

- `vibecoder-rasp/state-colocation`: Enforce state colocation
- `vibecoder-rasp/no-prop-drilling`: Prevent prop drilling beyond configured depth
- `vibecoder-rasp/derived-state-memo`: Require `useMemo` for derived state
- `vibecoder-rasp/no-state-mutation`: Prevent direct state mutations

### Effects

- `vibecoder-rasp/require-use-effect-cleanup`: Require cleanup for useEffect with subscriptions
- `vibecoder-rasp/exhaustive-deps`: Enforce exhaustive deps in hooks

### Components

- `vibecoder-rasp/explicit-props`: Enforce explicit prop types
- `vibecoder-rasp/no-prop-spreading`: Prevent prop spreading in components
- `vibecoder-rasp/consistent-prop-ordering`: Enforce consistent prop ordering

### Performance

- `vibecoder-rasp/no-inline-functions`: Prevent inline function definitions in JSX
- `vibecoder-rasp/require-keys`: Enforce `key` prop in lists

### TypeScript

- `vibecoder-rasp/no-any`: Prevent `any` type usage
- `vibecoder-rasp/explicit-return-types`: Require explicit return types
- `vibecoder-rasp/explicit-void-return`: Enforce explicit `: void` return type for functions without return statements
  - **Autofix**: Yes
  - **Applies to**:
    - Function declarations without return statements
    - Arrow functions with block bodies `{}` without return statements
  - **Example**:

    ```typescript
    // Bad
    function handleClick() {
      console.log('clicked');
    }
    
    const handleSubmit = () => {
      console.log('submitted');
    };
    
    // Good
    function handleClick(): void {
      console.log('clicked');
    }
    
    const handleSubmit = (): void => {
      console.log('submitted');
    };
    
    // Allowed (has return statement)
    function calculate(): number {
      return 42;
    }
    
    // Allowed (implicit return)
    const double = (n: number) => n * 2;
    ```

- `vibecoder-rasp/no-ts-ignore`: Prevent `@ts-ignore` usage

### Accessibility

- `vibecoder-rasp/button-type`: Enforce explicit `type` attribute on button elements
  - **Options**:
    - `enforceType`: `true` to require explicit type (default: `true`)
    - `defaultType`: The default type to add when missing (default: `'button'`)
  - **Autofix**: Yes
  - **Example**:

    ```jsx
    // Bad
    <button>Click me</button>
    
    // Good
    <button type="button">Click me</button>
    
    // Also good (explicitly set to submit)
    <button type="submit">Submit</button>
    ```

## Versioning

This project follows [Semantic Versioning](https://semver.org/).

## License

MIT © [Vibecoder](https://github.com/your-org)
