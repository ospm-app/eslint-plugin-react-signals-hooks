# Naming Convention Rule Specification

Enforces consistent naming conventions for React components, files, and directories, improving codebase maintainability and discoverability.

## Core Functionality

This rule ensures that all React-related files and directories follow a standardized naming pattern, making it easier to locate and understand the purpose of each file in the project.

## Handled Cases

### 1. File Naming

- Validates component file names (PascalCase by default)
- Enforces consistent file extensions (.tsx, .jsx, etc.)
- Handles index files and special file names

### 2. Directory Structure

- Validates directory naming (kebab-case by default)
- Ensures consistent organization of component files

### 3. Component Naming

- Validates component names against file names
- Enforces consistent naming for higher-order components
- Handles compound components and context providers

## Error Messages

- `invalidFileName": "File '{{fileName}}' does not match the naming convention. Expected format: {{expectedFormat}}."
- `invalidDirectoryName": "Directory '{{directoryName}}' does not match the naming convention. Expected format: {{expectedFormat}}."
- `componentNameMismatch": "Component name '{{componentName}}' should match the file name '{{fileName}}'."
- `invalidHookName": "Custom hook '{{hookName}}' should start with 'use' followed by a capital letter."

## Auto-fix Suggestions

- Renames files to match the specified conventions
- Updates import statements when files are renamed
- Fixes component names to match file names
- Converts between different naming conventions

## Benefits

1. __Improved Discoverability__: Consistent naming makes files easier to find
2. __Better Collaboration__: Standardized patterns reduce confusion
3. __Easier Maintenance__: Clear naming indicates file purpose and content
4. __Automated Refactoring__: Simplifies large-scale code changes

## When to Disable

- When working with third-party code that follows different conventions
- During migrations when immediate changes aren't feasible
- For generated code that can't be easily modified

## Configuration

```json
{
  "naming-convention": ["error", {
    "fileNaming": {
      "component": "PascalCase",
      "test": "{{name}}.test.{{ext}}",
      "style": "{{name}}.module.{{ext}}",
      "type": "{{name}}.types.{{ext}}"
    },
    "directoryNaming": {
      "component": "kebab-case",
      "hook": "use-{{name}}",
      "util": "{{name}}-utils"
    },
    "componentNaming": {
      "default": "PascalCase",
      "hoc": "with{{name}}",
      "context": "{{name}}Context"
    },
    "typescript": {
      "enabled": true
    },
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `fileNaming`: Defines naming patterns for different file types
- `directoryNaming`: Defines naming patterns for directories
- `componentNaming`: Defines naming patterns for different component types
- `typescript.enabled`: Enable TypeScript-specific validations (default: true)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. __Be Consistent__: Follow the established naming conventions
2. __Be Descriptive__: Use meaningful, descriptive names
3. __Keep It Short__: Avoid overly long names
4. __Use Abbreviations Sparingly__: Only use well-known abbreviations
5. __Document Exceptions__: Add comments when deviating from conventions

## Performance Impact

- No runtime impact
- Minimal build-time overhead
- Helps prevent naming-related issues early

## TypeScript Integration

- Validates TypeScript type definitions
- Ensures type names follow conventions
- Handles generics and complex types
- Integrates with React's type system
