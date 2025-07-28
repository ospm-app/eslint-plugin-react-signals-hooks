# No TS Ignore Rule Specification

Prohibits the use of `@ts-ignore` and `@ts-expect-error` comments without explanatory comments, ensuring that TypeScript errors are properly addressed rather than suppressed.

## Core Functionality

This rule enforces the addition of explanatory comments when using TypeScript's error suppression comments. It ensures that all suppressions are justified and documented, making the codebase more maintainable and helping to track down potential issues.

## Handled Cases

### 1. Uncommented Suppressions

- Detects `@ts-ignore` and `@ts-expect-error` without accompanying comments
- Identifies suppression comments that don't explain the reason for suppression
- Handles both single-line and block comments

### 2. Insufficient Justification

- Flags comments that don't provide enough context
- Identifies generic or non-descriptive justifications
- Validates that comments explain both the issue and the reason for suppression

### 3. Error Code References

- Encourages referencing specific TypeScript error codes
- Validates that error codes are correctly formatted
- Handles multiple error codes in a single suppression

## Error Messages

- `tsIgnoreWithoutComment": "Do not use`@ts-ignore` without a comment explaining the suppression."
- `tsExpectErrorWithoutComment": "Do not use`@ts-expect-error` without a comment explaining the suppression."
- `insufficientJustification": "Suppression comment is insufficient. Explain both the issue and reason for suppression."
- `missingErrorCode": "Include the specific TypeScript error code being suppressed (e.g., TS2345)."

## Auto-fix Suggestions

- Adds a TODO comment for missing justifications
- Preserves existing comments and formatting
- Suggests adding specific error codes
- Formats comments consistently

## Benefits

1. **Improved Code Quality**: Ensures all suppressions are properly documented
2. **Better Maintainability**: Makes it easier to track down and fix suppressed errors
3. **Team Alignment**: Encourages consistent practices around error suppression
4. **Knowledge Sharing**: Helps other developers understand why a suppression is needed

## When to Disable

- In generated code
- In test utilities that intentionally test error cases
- During rapid prototyping (with intention to fix later)

## Configuration

```json
{
  "no-ts-ignore": ["error", {
    "allowWithDescription": true,
    "allowWithTag": ["TODO", "FIXME"],
    "requireErrorCode": true,
    "typescript": {
      "noImplicitAny": true
    },
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `allowWithDescription`: Allow suppression with a description (default: true)
- `allowWithTag`: Array of tags that allow suppression (default: ["TODO", "FIXME"])
- `requireErrorCode`: Require specific TypeScript error codes (default: true)
- `typescript.noImplicitAny`: Enable TypeScript's noImplicitAny (default: true)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Be Specific**: Always include the specific error code being suppressed
2. **Explain Why**: Document why the suppression is necessary
3. **Add TODOs**: Include a ticket number or plan to fix the issue
4. **Review Regularly**: Periodically review and remove suppressions
5. **Prefer @ts-expect-error**: Use `@ts-expect-error` instead of `@ts-ignore` when possible

## Performance Impact

- Minimal runtime overhead during linting
- No impact on production performance
- May improve development experience by encouraging better error handling

## TypeScript Integration

- Works with all TypeScript versions that support error suppression comments
- Integrates with TypeScript's error reporting
- Supports all TypeScript compiler options
- Works with both JavaScript and TypeScript files
