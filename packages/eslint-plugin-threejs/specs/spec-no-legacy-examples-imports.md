# No Legacy Examples Imports Rule Specification

This rule prevents the use of imports from the Three.js examples directory, which are considered legacy and can cause compatibility issues. It encourages the use of official, supported APIs instead.

## Core Functionality

This rule detects and reports imports from the Three.js examples directory, which are not part of the core library and may change or be removed without notice.

## Handled Cases

### 1. Direct Imports from 'three/examples'

Detects imports from the 'three/examples' path and suggests alternatives.

### 2. Aliased Imports

Identifies imports that alias the examples directory.

### 3. Dynamic Imports

Detects dynamic imports from the examples directory.

### 4. Require Statements

Finds CommonJS require statements that reference the examples directory.

## Error Messages

- `legacyImport`: "Importing from 'three/examples' is not recommended. {{suggestion}}."
- `legacyImportWithReplacement`: "Importing '{{imported}}' from 'three/examples' is not recommended. Use '{{replacement}}' instead."

## Auto-fix Suggestions

The rule provides auto-fixes that:

1. Replace common example imports with their core library equivalents when possible
2. Add comments explaining why the import was removed
3. Preserve import formatting and style

## Benefits

1. **Stability**: Prevents breakage when example code changes
2. **Bundle Size**: Reduces bundle size by avoiding unnecessary example code
3. **Maintainability**: Encourages use of stable, documented APIs
4. **Performance**: Core library components are often more optimized

## When to Disable

This rule should only be disabled when:

- Working with legacy code that cannot be updated
- The specific example code has no equivalent in the core library
- Testing the rule itself

## Implementation Notes

- The rule checks both static and dynamic imports
- It handles various import syntaxes (ESM, CommonJS)
- The auto-fix provides context-aware suggestions
- It includes a configuration option to whitelist specific example imports

## Related Resources

- [Three.js Migration Guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide)
- [Three.js Examples Documentation](https://threejs.org/docs/#examples)
- [Three.js Modules](https://github.com/mrdoob/three.js/tree/dev/examples/jsm)
