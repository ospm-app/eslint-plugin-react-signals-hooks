# Enforce Type Import Style (auto-fix-type-imports)

This rule automatically fixes type imports to ensure they use the `type` keyword when appropriate, and removes it when not needed.

## Rule Details

This rule enforces the following behaviors:

1. Adds `type` keyword to imports that are only used as types
2. Removes `type` keyword from imports that are used as values
3. Handles mixed imports (when the same import is used both as a type and as a value)

### Examples

**Incorrect** code for this rule:

```typescript
// Type used as value
import { type fetchUser } from './api';

// Value used as type
import { User } from './types';

function getUser(): User {
  return fetchUser();
}
```

**Correct** code for this rule:

```typescript
import { fetchUser } from './api';
import type { User } from './types';

function getUser(): User {
  return fetchUser();
}
```

## When Not To Use It

If you don't want to enforce a specific style for type imports, you can disable this rule.

## Implementation Details

The rule analyzes how each imported identifier is used throughout the code:
- If an identifier is only used in type positions, it will add the `type` keyword
- If an identifier is used as a value, it will remove the `type` keyword
- For mixed usage, it will split the import into separate value and type imports

## Related To

- [TypeScript Type-Only Imports and Exports](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-8.html#type-only-imports-and-export)
