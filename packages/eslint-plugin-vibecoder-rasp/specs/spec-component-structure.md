# Component Structure Rule Specification

Enforces a consistent file structure for React components, improving codebase maintainability and developer experience through standardized organization.

## Core Functionality

This rule ensures that React component files follow a consistent structure, making it easier to locate and understand different parts of a component. It validates the order and presence of various component elements.

## Handled Cases

### 1. Import Statements

- Validates third-party vs. internal imports
- Ensures React imports come first
- Groups related imports together

### 2. Component Definition

- Enforces consistent component declaration style
- Validates component naming conventions
- Handles both function and class components

### 3. Internal Logic

- Validates hook usage order
- Ensures proper organization of state and effects
- Handles custom hooks and context usage

### 4. Export Statements

- Validates default vs. named exports
- Ensures consistent export style
- Handles compound component patterns

## Error Messages

- `invalidImportOrder": "Import statements are not in the correct order. Expected order: React imports, third-party, internal components, styles, types."
- `missingComponentName": "Component should be named with PascalCase and match the file name."
- `invalidHookOrder": "Hooks should be called in the same order on every render. Move '{{hook}}' to the top level of the component."
- `invalidExportStyle": "Use {{preferredStyle}} export for the component."

## Auto-fix Suggestions

- Reorders imports according to the specified conventions
- Renames components to match file names
- Reorganizes hooks to follow Rules of Hooks
- Fixes export style to match configuration

## Benefits

1. **Improved Readability**: Consistent structure makes code easier to navigate
2. **Better Maintainability**: Standardized patterns reduce cognitive load
3. **Easier Onboarding**: New team members can quickly understand the codebase
4. **Reduced Errors**: Enforces best practices for React components

## When to Disable

- For legacy code that can't be easily restructured
- When using a different file organization pattern
- In files that don't follow the standard component structure

## Configuration

```json
{
  "component-structure": ["error", {
    "importOrder": [
      "react",
      "^@[^/]+/",
      "^[^./]",
      "^[.]"
    ],
    "componentNaming": {
      "case": "PascalCase",
      "matchFile": true
    },
    "hooksOrder": [
      "useState",
      "useEffect",
      "useContext",
      "useReducer",
      "useCallback",
      "useMemo",
      "useRef"
    ],
    "typescript": {
      "prefer": "type-annotation"
    },
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `importOrder`: Array of regex patterns defining import order
- `componentNaming.case`: Naming convention for components ("PascalCase" or "camelCase")
- `componentNaming.matchFile`: Whether component name must match file name (default: true)
- `hooksOrder`: Preferred order for React hooks
- `typescript.prefer`: Preferred TypeScript syntax ("type-annotation" or "interface")
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Follow the Pattern**: Adhere to the established structure
2. **Keep Components Focused**: Each file should contain one main component
3. **Use Named Exports**: For better code navigation and tree-shaking
4. **Group Related Code**: Keep related hooks and logic together
5. **Document Exceptions**: Add comments when deviating from the standard

## Performance Impact

- No runtime impact
- Minimal build-time overhead
- Helps identify potential performance issues through better organization

## TypeScript Integration

- Validates TypeScript types and interfaces
- Ensures proper type usage in components
- Handles generic components and type parameters
- Integrates with React's built-in type utilities
