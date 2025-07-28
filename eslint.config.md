# ESLint Configuration Analysis

## Installed Plugins

- `@typescript-eslint/eslint-plugin` (v8.38.0)
- `eslint-plugin-import` (v2.32.0)
- `eslint-plugin-jsx-a11y` (v6.10.2)
- `eslint-plugin-n` (v17.21.0)
- `eslint-plugin-optimize-regex` (v1.2.1)
- `eslint-plugin-promise` (v7.2.1)
- `@ospm/eslint-plugin-react-signals-hooks` (local)

## Key Rules

### Common Rules

```javascript
{
  'no-console': ['error', { allow: ['warn', 'error', 'info', 'table', 'debug', 'clear'] }],
  'optimize-regex/optimize-regex': 'warn',
  'es-x/no-async-iteration': 'error',
  'es-x/no-malformed-template-literals': 'error'
}
```

### Disabled Rules

```javascript
{
  'n/no-missing-import': 'off',
  'indent': 'off',
  'no-unused-vars': 'off',
  '@typescript-eslint/no-var-requires': 'off',
  '@typescript-eslint/explicit-function-return-type': 'off'
}
```

## Plugin Analysis

### eslint-plugin-import

- **Status**: Using recommended rules
- **Useful Disabled Rules**:
  <!-- - `import/no-unresolved`: Could help catch missing dependencies - not useful in typescript -->
  <!-- - `import/order`: Could enforce consistent import ordering - arguable -->

### eslint-plugin-jsx-a11y

- **Status**: Using recommended rules
- **Useful Additional Rules**:
  - `jsx-a11y/no-static-element-interactions`: Prefers proper interactive elements
  - `jsx-a11y/click-events-have-key-events`: Ensures clickable elements are keyboard accessible

### eslint-plugin-promise

- **Status**: Using recommended rules
- **Useful Additional Rules**:
  - `promise/no-return-wrap`: Prevents unnecessary promise wrapping
  - `promise/prefer-await-to-then`: Encourages async/await over promise chains

### Installed ESLint Plugins

### @typescript-eslint/eslint-plugin (v8.38.0)

- **Type**: Core
- **Purpose**: TypeScript-specific linting rules
- **Key Rules**:
  - `@typescript-eslint/no-unused-vars`: Identifies unused variables with TypeScript support
  - `@typescript-eslint/no-explicit-any`: Warns against using `any` type
  - `@typescript-eslint/explicit-module-boundary-types`: Requires explicit return and argument types
- **Recommendations**:
  - Enable `@typescript-eslint/await-thenable` to catch invalid `await` usage
  - Enable `@typescript-eslint/no-floating-promises` to prevent unhandled promises
  - Enable `@typescript-eslint/consistent-type-imports` for consistent type imports

### eslint-plugin-import (v2.32.0)

- **Type**: Code Style
- **Purpose**: Supports ES6+ import/export syntax
- **Key Rules**:
  - `import/no-unresolved`: Ensures imports point to valid modules
  - `import/named`: Verifies named imports exist in the referenced module
  - `import/namespace`: Validates namespace imports
- **Recommendations**:
  - Enable `import/order` to enforce consistent import ordering
  - Enable `import/no-cycle` to detect circular dependencies
  - Enable `import/no-unused-modules` to find unused modules

### eslint-plugin-jsx-a11y (v6.10.2)

- **Type**: Accessibility
- **Purpose**: Enforces accessibility best practices in JSX
- **Key Rules**:
  - `jsx-a11y/alt-text`: Enforces alt text on images
  - `jsx-a11y/aria-props`: Validates ARIA properties
  - `jsx-a11y/aria-role`: Ensures valid ARIA roles
- **Recommendations**:
  - Enable `jsx-a11y/no-static-element-interactions`
  - Enable `jsx-a11y/click-events-have-key-events`
  - Enable `jsx-a11y/label-has-associated-control`

### eslint-plugin-n (v17.21.0)

- **Type**: Core
- **Purpose**: Additional ESLint rules for Node.js
- **Key Rules**:
  - `n/handle-callback-err`: Enforces error handling in callbacks
  - `n/no-callback-literal`: Prevents calling callbacks with non-error literals
  - `n/no-deprecated-api`: Disallows deprecated Node.js APIs
- **Recommendations**:
  - Enable `n/no-process-exit` to prevent direct `process.exit()` calls
  - Enable `n/no-sync` to disallow synchronous methods
  <!-- - Enable `n/no-missing-import` to catch missing imports - рфтвдув ин ензуыскшзе -->

### eslint-plugin-optimize-regex (v1.2.1)

- **Type**: Performance
- **Purpose**: Optimizes regular expressions
- **Key Rules**:
  - `optimize-regex/optimize-regex`: Suggests optimizations for regex patterns
- **Recommendations**:
  - Keep at warning level to avoid build failures
  - Review each suggestion carefully as some optimizations may reduce readability
  - Consider disabling for test files where complex regex patterns are common

### eslint-plugin-promise (v7.2.1)

- **Type**: Best Practices
- **Purpose**: Enforces best practices for JavaScript promises
- **Key Rules**:
  - `promise/param-names`: Enforces consistent parameter naming in promises
  - `promise/always-return`: Ensures promises always return a value
  - `promise/catch-or-return`: Requires catch or return in promises
- **Recommendations**:
  - Enable `promise/prefer-await-to-then` to encourage async/await
  - Enable `promise/no-native` in modern codebases
  - Consider enabling `promise/no-nesting` to prevent promise pyramids

### eslint-plugin-es (v4.1.0)

- **Type**: Core
- **Purpose**: Additional ES5+ rules
- **Key Rules**:
  - `es/no-regexp-lookbehind-assertions`: Disallows RegExp lookbehind assertions
  - `es/no-optional-chaining`: Disallows optional chaining
- **Recommendations**:
  - Enable ES2020+ rules for modern codebases
  - Disable rules that conflict with TypeScript
  - Consider using `@babel/eslint-parser` for better ES features support

### eslint-plugin-eslint-plugin (v6.5.0)

- **Type**: Development
- **Purpose**: Linting rules for ESLint plugins
- **Key Rules**:
  - `eslint-plugin/require-meta-docs-description`: Requires descriptions in rule metadata
  - `eslint-plugin/require-meta-type`: Requires type in rule metadata
- **Recommendations**:
  - Keep enabled for plugin development
  - Configure to match project's documentation standards
  - Consider enabling `eslint-plugin/require-meta-schema` for better rule validation

### eslint-plugin-json (v4.0.1)

- **Type**: Code Quality
- **Purpose**: Linting for JSON files
- **Key Rules**:
  - `json/*`: Validates JSON syntax and structure
  - `json/undefined`: Disallows `undefined` in JSON
  - `json/enum-value-mismatch`: Ensures enum values match their type
- **Recommendations**:
  - Enable for all JSON configuration files
  - Consider enabling `json/sort-package-json` to keep package.json organized

### eslint-plugin-perf-standard (v1.0.3) - outdated, not supporting eslint 9

- **Type**: Performance
- **Purpose**: Performance-related rules
- **Key Rules**:
  - `perf-standard/no-instanceof-array`: Prevents `instanceof Array` in favor of `Array.isArray()`
  - `perf-standard/no-self-in-array-methods`: Prevents unnecessary `this` in array methods
- **Recommendations**:
  - Enable for performance-critical code
  - Consider disabling in test files where performance is less critical

### eslint-plugin-xss (v0.1.12) - outdated, doesn't support eslint 9

- **Type**: Security
- **Purpose**: Prevents XSS (Cross-Site Scripting) vulnerabilities
- **Key Rules**:
  - `xss/no-mixed-html`: Prevents mixing HTML with non-HTML content
  - `xss/no-location-href-assign`: Prevents XSS via `location.href`
- **Recommendations**:
  - Enable for all React components that render user input
  - Combine with `eslint-plugin-security` for comprehensive protection

### eslint-plugin-oxlint (v1.8.0)

- **Type**: Code Quality
- **Purpose**: Additional linting rules from oxlint
- **Key Rules**:
  - `oxlint/*`: Various code quality and style rules
- **Recommendations**:
  - Use for additional code quality checks
  - May overlap with other plugins, so configure carefully

## Performance Considerations

1. **Rule Impact**:
   - Most expensive: `@typescript-eslint` rules with type checking
   - Moderate: `import/no-cycle`, `import/no-unresolved`
   - Lightweight: Formatting rules, simple syntax rules

2. **Optimization Tips**:
   - Use `overrides` to apply expensive rules only to relevant files
   - Consider disabling expensive rules in test files
   - Use `--cache` flag with ESLint for faster subsequent runs

## Recommended Rule Additions

1. **Security**:
   - `eslint-plugin-security`: Add for security-focused rules
   - `eslint-plugin-xss`: For preventing XSS vulnerabilities

2. **Code Quality**:
   - `eslint-plugin-unicorn`: For additional best practices
   - `eslint-plugin-sonarjs`: For code smell detection

3. **React-Specific**:
   - `eslint-plugin-react-hooks`: Essential for React hooks
   - `eslint-plugin-react-perf`: For performance optimizations

## Configuration Example

```javascript
module.exports = {
  extends: [
    'eslint:recommended',
    'plugin:@typescript-eslint/recommended',
    'plugin:import/recommended',
    'plugin:jsx-a11y/recommended',
    'plugin:promise/recommended'
  ],
  plugins: [
    '@typescript-eslint',
    'import',
    'jsx-a11y',
    'promise',
    'optimize-regex'
  ],
  rules: {
    // TypeScript
    '@typescript-eslint/no-explicit-any': 'warn',
    '@typescript-eslint/explicit-module-boundary-types': 'error',
    
    // Import
    'import/order': ['error', {
      'groups': ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      'newlines-between': 'always'
    }],
    
    // JSX Accessibility
    'jsx-a11y/no-static-element-interactions': 'error',
    'jsx-a11y/click-events-have-key-events': 'warn',
    
    // Promise
    'promise/prefer-await-to-then': 'warn',
    
    // Performance
    'optimize-regex/optimize-regex': 'warn'
  }
};
```

## Implementation Strategy

1. **Start with Security**:
   - Add security-related rules first
   - Fix critical issues before moving to style and quality rules

2. **Incremental Adoption**:
   - Add rules in small batches
   - Use `--fix` where possible
   - Gradually increase rule severity from 'off' to 'warn' to 'error'

3. **Team Alignment**:
   - Document rule decisions
   - Establish coding standards
   - Use comments to explain rule exceptions

## Maintenance

1. **Regular Updates**:
   - Keep plugins updated
   - Review and update rules with major version updates
   - Remove deprecated rules

2. **Performance Monitoring**:
   - Monitor lint times
   - Profile slow rules
   - Consider using `--cache` for development

3. **Documentation**:
   - Keep rule documentation up to date
   - Document rule exceptions
   - Maintain a changelog for rule changes
