# Consistent Rule Structure Rule

This rule enforces consistent structure and properties across all ESLint rules in the codebase. It helps maintain code quality and developer experience by standardizing rule definitions.

## Rule Details

This rule analyzes ESLint rule definitions and reports inconsistencies in:

1. Rule export naming conventions
2. Meta properties (type, docs, hasSuggestions, fixable, etc.)
3. Message ID naming patterns
4. Performance tracking implementation
5. Documentation structure

## Why is this important?

1. **Maintainability**: Ensures all rules follow the same structure, making the codebase easier to maintain
2. **Developer Experience**: Provides consistent patterns for rule authors
3. **Code Quality**: Catches potential issues early in development
4. **Documentation**: Ensures all rules are properly documented
5. **Performance**: Standardizes performance tracking across rules

## Options

This rule accepts an options object with the following properties:

```typescript
interface Options {
  /** Whether to require performance tracking in rules */
  requirePerformanceTracking?: boolean;
  
  /** Whether to require documentation URLs */
  requireDocumentationUrl?: boolean;
  
  /** Whether to enforce naming conventions */
  enforceNamingConvention?: boolean;
  
  /** List of rule names to exclude from this rule */
  exemptRules?: string[];
  
  /** Performance tuning options */
  performance?: {
    maxTime?: number;
    maxMemory?: number;
    maxNodes?: number;
    enableMetrics?: boolean;
    logMetrics?: boolean;
    maxOperations?: Record<string, number>;
  };
}
```

### Default Options

```json
{
  "requirePerformanceTracking": true,
  "requireDocumentationUrl": true,
  "enforceNamingConvention": true,
  "exemptRules": [],
  "performance": {
    "maxTime": 1000,
    "maxNodes": 2000,
    "enableMetrics": false,
    "logMetrics": false
  }
}
```

## Error Messages

This rule can report the following types of issues:

### Missing Rule Suffix

- **Message**: "Rule export name must end with 'Rule'"
- **Description**: The rule's export name must end with 'Rule' (e.g., `myRule` should be `myRuleRule`)
- **Fix Suggestion**: Add 'Rule' suffix to the export name

### Inconsistent Naming

- **Message**: "Rule export name must match the rule name in camelCase"
- **Description**: The rule's export name must match its name in camelCase
- **Fix Suggestion**: Ensure the export name matches the rule name in camelCase

### Missing Meta Property

- **Message**: "Missing required meta property: {{property}}"
- **Description**: A required meta property is missing from the rule definition
- **Fix Suggestion**: Add the missing meta property

### Invalid Meta Type

- **Message**: "Meta property '{{property}}' has invalid type. Expected {{expected}}, got {{actual}}"
- **Description**: A meta property has an incorrect type
- **Fix Suggestion**: Ensure the meta property has the correct type

### Missing Documentation URL

- **Message**: "Rule documentation is missing a URL"
- **Description**: The rule's meta.docs.url property is missing
- **Fix Suggestion**: Add a documentation URL to the rule's meta.docs.url property

### Inconsistent hasSuggestions

- **Message**: "hasSuggestions should be set to true for rules providing suggestions"
- **Description**: The rule provides suggestions but doesn't have hasSuggestions set to true
- **Fix Suggestion**: Set hasSuggestions to true in the rule's meta object

### Invalid Fixable Value

- **Message**: "fixable must be 'code' for rules that provide fixes"
- **Description**: The rule's fixable property has an invalid value
- **Fix Suggestion**: Set fixable to 'code' if the rule provides fixes

### Inconsistent Message ID Format

- **Message**: "Message ID '{{id}}' should be in camelCase"
- **Description**: A message ID doesn't follow the camelCase format
- **Fix Suggestion**: Convert the message ID to camelCase

### Missing Performance Tracking

- **Message**: "Performance tracking is missing for this rule"
- **Description**: The rule is missing performance tracking code
- **Fix Suggestion**: Add performance tracking to the rule

### Inconsistent Performance Logging

- **Message**: "Performance logging should be consistent with other rules"
- **Description**: The rule's performance logging is inconsistent
- **Fix Suggestion**: Align performance logging with other rules

### Invalid Recommended Property

- **Message**: "The 'recommended' property should not be in the 'docs' object"
- **Description**: The rule has a 'recommended' property in the 'docs' object
- **Fix Suggestion**: Remove the 'recommended' property from the 'docs' object

### Use Source Code Property

- **Message**: "Use context.sourceCode instead of context.getSourceCode()"
- **Description**: The rule uses the deprecated context.getSourceCode() method
- **Fix Suggestion**: Replace with context.sourceCode

### Use Filename Property

- **Message**: "Use context.filename instead of context.getFilename()"
- **Description**: The rule uses the deprecated context.getFilename() method
- **Fix Suggestion**: Replace with context.filename

## Example Configuration

```json
{
  "rules": {
    "eslint-rule/consistent-rule-structure": [
      "error",
      {
        "requirePerformanceTracking": true,
        "requireDocumentationUrl": true,
        "enforceNamingConvention": true,
        "exemptRules": ["example-rule"],
        "performance": {
          "maxTime": 2000,
          "maxNodes": 3000
        }
      }
    ]
  }
}
```

## When Not To Use It

This rule should only be disabled in the following cases:

1. When working with third-party rules that can't be modified
2. During migration of legacy rules to the new standard
3. When the rule's structure is intentionally different for a valid reason

## Auto-fix Capabilities

This rule provides auto-fix capabilities for:

- Adding missing 'Rule' suffix to export names
- Standardizing message IDs to camelCase
- Adding missing meta properties with default values
- Standardizing fixable property to 'code' where applicable
- Replacing deprecated method calls (getSourceCode → sourceCode, getFilename → filename)

## Related Rules

- `eslint-plugin/require-meta-type`: Ensures rules have a type property
- `eslint-plugin/require-meta-docs-url`: Ensures rules have a documentation URL
- `eslint-plugin/require-meta-docs-description`: Ensures rules have a description
