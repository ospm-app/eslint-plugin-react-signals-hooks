# Consistent Rule Structure Rule Specification

Ensures consistent structure and properties across all ESLint rules in the codebase. This rule helps maintain code quality and developer experience by enforcing standardized rule definitions.

## Core Functionality

This rule analyzes ESLint rule definitions and reports inconsistencies in:

1. Rule export naming conventions
2. Meta properties (type, docs, hasSuggestions, fixable, etc.)
3. Message ID naming patterns
4. Performance tracking implementation
5. Documentation structure

## Handled Cases

### 1. Rule Export Naming

- Ensures rule exports follow the `camelCaseRule` pattern
- Verifies the export name matches the rule name
- Checks for consistent use of the 'Rule' suffix

### 2. Meta Property Consistency

- Validates presence of required meta properties
- Ensures consistent meta property types
- Verifies documentation URL presence and format
- Checks for consistent use of `hasSuggestions`
- Validates `fixable` property values
- Removes `recommended` property from `docs` object as it's not a valid property

### 3. Message ID Naming

- Enforces camelCase message IDs
- Ensures message IDs are descriptive and consistent
- Verifies message placeholders follow a standard format

### 4. Performance Tracking

- Validates consistent implementation of performance tracking
- Ensures performance metrics are properly logged
- Verifies performance budget configurations

### 5. Code Style

- Enforces use of `context.sourceCode` instead of `context.getSourceCode()`
- Enforces use of `context.filename` instead of `context.getFilename()`
- Ensures consistent code style across all rules

## Error Messages

- `missingRuleSuffix`: "Rule export name must end with 'Rule'"
- `inconsistentNaming`: "Rule export name must match the rule name in camelCase"
- `missingMetaProperty`: "Missing required meta property: {{property}}"
- `invalidMetaType`: "Meta property '{{property}}' has invalid type. Expected {{expected}}, got {{actual}}"
- `missingDocsUrl`: "Rule documentation is missing a URL"
- `inconsistentHasSuggestions`: "hasSuggestions should be set to true for rules providing suggestions"
- `invalidFixableValue`: "fixable must be 'code' for rules that provide fixes"
- `inconsistentMessageIdFormat": "Message ID '{{id}}' should be in camelCase"
- `missingPerformanceTracking": "Performance tracking is missing for this rule"
- `inconsistentPerformanceLogging`: "Performance logging should be consistent with other rules"
- `invalidRecommendedProperty": "The 'recommended' property should not be in the 'docs' object"
- `useSourceCodeProperty`: "Use context.sourceCode instead of context.getSourceCode()"
- `useFilenameProperty`: "Use context.filename instead of context.getFilename()"

## Auto-fix Suggestions

This rule provides limited auto-fix capabilities for simple cases:

- Adding missing 'Rule' suffix to export names
- Standardizing message IDs to camelCase
- Adding missing meta properties with default values
- Standardizing fixable property to 'code' where applicable

## Benefits

1. **Maintainability**: Ensures all rules follow the same structure, making the codebase easier to maintain
2. **Developer Experience**: Provides consistent patterns for rule authors
3. **Code Quality**: Catches potential issues early in development
4. **Documentation**: Ensures all rules are properly documented
5. **Performance**: Standardizes performance tracking across rules

## When to Disable

This rule should only be disabled in the following cases:

- When working with third-party rules that can't be modified
- During migration of legacy rules to the new standard
- When the rule's structure is intentionally different for a valid reason

## Configuration

```json
{
  "consistent-rule-structure": ["error", {
    "requirePerformanceTracking": true,
    "requireDocumentationUrl": true,
    "enforceNamingConvention": true,
    "exemptRules": ["rule-name-to-exclude"]
  }]
}
```

### Options

- `requirePerformanceTracking` (boolean, default: true) - Enforce performance tracking in rules
- `requireDocumentationUrl` (boolean, default: true) - Require documentation URLs
- `enforceNamingConvention` (boolean, default: true) - Enforce naming conventions
- `exemptRules` (string[], default: []) - List of rule names to exclude from this rule

## Best Practices

1. **Consistent Structure**: Follow the standard rule structure for all new rules
2. **Documentation**: Always include comprehensive documentation
3. **Testing**: Ensure all rules have corresponding test cases
4. **Performance**: Implement proper performance tracking
5. **Code Review**: Include this rule in code review checklists

## Performance Impact

This rule has minimal performance impact as it only runs during the ESLint initialization phase. It analyzes rule definitions rather than source code, so it doesn't affect the performance of other rules.

## TypeScript Integration

This rule is fully typed and provides TypeScript type checking for:

- Rule options
- Message IDs
- Meta property types
- Report descriptors

It also includes type definitions for the rule context and other utilities used in the implementation.
