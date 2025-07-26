# Exhaustive Dependencies Rule Specification

This document outlines the various cases that the `exhaustive-deps` rule handles when analyzing React hooks and their dependencies.

## Core Functionality

The rule verifies and enforces proper dependency arrays in React hooks, specifically focusing on:

- Detecting missing dependencies
- Identifying unnecessary dependencies
- Finding duplicate dependencies
- Validating dependency array structure
- Special handling for different hook types

## Handled Cases

### 1. Missing Dependencies

- Detects variables used inside the effect but not listed in the dependency array
- Handles nested function calls and property accesses
- Considers variables from outer scopes
- Identifies missing dependencies in callback functions

### 2. Unnecessary Dependencies

- Flags constants and values that never change
- Identifies imports and module-level variables that don't need to be in deps
- Detects stable values that are recreated on each render

### 3. Duplicate Dependencies

- Finds and reports duplicate entries in dependency arrays
- Handles both simple and complex expressions
- Provides quick fixes to remove duplicates

### 4. Dependency Array Structure

- Validates that hooks receive proper array literals as dependency arrays
- Detects when dependency arrays are missing entirely
- Handles cases where non-array values are provided

### 5. Special Hook Types

- **useEffect**: Validates effect callbacks and cleanup functions
- **useMemo/useCallback**: Checks for proper dependency arrays
- **Custom Hooks**: Supports configuration for additional hooks via options
- **useEffectEvent**: Special handling for event handlers created with useEffectEvent

### 6. Performance Considerations

- Tracks and limits analysis performance with configurable budgets
- Handles complex component trees efficiently
- Provides performance metrics when enabled

### 7. Signal Integration

- Special handling for signal-based state management
- Detects signal access patterns
- Validates signal usage in dependency arrays

### 8. Async Effects

- Detects and warns about async effect callbacks
- Suggests proper patterns for async operations in effects
- Helps prevent race conditions and memory leaks

### 9. Dynamic Dependencies

- Handles computed property names
- Validates spread elements in dependency arrays
- Detects complex expressions that might cause issues

### 10. Scope Analysis

- Tracks variable references across function scopes
- Handles closures and nested functions
- Considers variable shadowing and hoisting

## Configuration Options

The rule accepts several configuration options:

- `additionalHooks`: Pattern for additional hooks to check
- `enableDangerousAutofixThisMayCauseInfiniteLoops`: Enables potentially risky autofixes
- `experimental_autoDependenciesHooks`: List of hooks for automatic dependency determination
- `requireExplicitEffectDeps`: Enforces explicit dependency arrays for all effects
- `enableAutoFixForMemoAndCallback`: Enables autofix for useMemo and useCallback hooks
- `performance`: Performance tuning options for the rule

## Error Messages

The rule provides detailed error messages that explain:

- Why a dependency is required
- The potential impact of missing or incorrect dependencies
- How to fix the issue
- Best practices for dependency management

## Auto-fix Capabilities

Where safe, the rule can automatically:

- Add missing dependencies
- Remove unnecessary dependencies
- Remove duplicate dependencies
- Format dependency arrays

## Limitations

- Cannot track dynamic property access in all cases
- May have limited understanding of complex state management patterns
- Performance may degrade with very large components or complex dependency graphs
