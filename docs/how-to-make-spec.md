# How to Write Rule Specifications

This guide explains how to create and maintain specification documents for ESLint rules in the `eslint-plugin-react-signals-hooks` package. These specifications serve as the primary documentation for each rule, helping developers understand their purpose, behavior, and proper usage.

## File Naming and Location

1. **File Naming**: Use the format `spec-{rule-name}.md` (e.g., `spec-prefer-signal-effect.md`)
2. **Location**: Place the spec file in the rule's directory under `src/`
   - Example: `src/prefer-signal-effect/spec-prefer-signal-effect.md`

## Specification Structure

Each specification should follow this structure:

```markdown
# [Rule Name] Rule Specification

[Brief 1-2 sentence description of what the rule does and why it's important]

## Core Functionality

[Detailed explanation of what the rule does, its purpose, and how it works]

## Handled Cases

### 1. [Case Name]
- Description of the specific case

[Repeat for each major case the rule handles]

## Error Messages

- `messageId`: "Human-readable error message"
- [List all possible error messages the rule can generate]

## Auto-fix Suggestions

- Description of what the auto-fix does
- Any limitations or edge cases where auto-fix might not be available

## Benefits

1. **Benefit 1**: Explanation
2. **Benefit 2**: Explanation
3. **Benefit 3**: Explanation

## When to Disable

Explain when it might be appropriate to disable the rule, such as:

- Specific edge cases
- Legacy code migration
- Performance considerations
- Integration with other libraries

## Configuration

If the rule is configurable, document all available options:

```json
{
  "rule-name": ["error", {
    "option1": value1,
    "option2": value2
  }]
}
```

## Best Practices

1. **Best Practice 1**: Explanation
2. **Best Practice 2**: Explanation
3. **Best Practice 3**: Explanation

## Performance Impact

- How the rule affects performance
- Any significant performance considerations
- Optimization tips

## TypeScript Integration

- How the rule works with TypeScript
- Any type-specific considerations
- Type safety guarantees

```markdown

## Writing Guidelines

### 1. Be Clear and Concise
- Use simple, direct language
- Avoid unnecessary technical jargon
- Keep paragraphs short and focused

### 2. Use Consistent Formatting
- Use backticks for code, variables, and file names
- Use bold for UI elements and important terms
- Use bullet points for lists of items

### 3. Include Practical Examples
- Show both incorrect and correct code
- Keep examples minimal but complete
- Add comments to explain non-obvious parts

### 4. Document Edge Cases
- Mention any known limitations
- Document false positives/negatives
- Include workarounds for common issues

### 5. Keep It Up-to-Date
- Update the spec when the rule changes
- Remove outdated information
- Add new examples as patterns evolve

## Example Section: Handled Cases

For each case your rule handles, include:

1. A clear description of the pattern
2. Example code showing violations
3. The corrected version
4. Any relevant notes or caveats

Example:

### 1. Direct Signal Access
- Detects when signals are accessed without `.value` in JSX

- Note: This only applies to JSX contexts

## Review Process

1. **Self-Review**: Check your spec for:
   - Completeness (all cases covered)
   - Accuracy (examples work as described)
   - Clarity (easy to understand)

2. **Peer Review**: Have another team member review:
   - Technical accuracy
   - Clarity and completeness
   - Consistency with other specs

3. **Update Tests**: Ensure the spec matches the test cases

## Common Pitfalls to Avoid

1. **Overly Technical Language**
   - ❌ "The rule traverses the AST to identify..."
   - ✅ "The rule finds cases where..."

2. **Missing Examples**
   - Always include both incorrect and correct examples
   - Show before/after for auto-fixable rules

3. **Outdated Information**
   - Keep the spec in sync with the rule implementation
   - Remove references to deprecated features

4. **Inconsistent Formatting**
   - Follow the established style
   - Be consistent with code formatting

## Template

Use this template when creating a new spec:

```markdown
# [Rule Name] Rule Specification

[Brief description]

## Core Functionality

[Detailed explanation]

## Handled Cases

### 1. [Case Name]
- Description

## Error Messages

- `messageId`: "Error message"

## Auto-fix Suggestions

[Description of auto-fix behavior]

## Benefits

1. **Benefit 1**: Description
2. **Benefit 2**: Description

## When to Disable

[When to disable the rule]

## Configuration

[Configuration options if any]

## Best Practices

1. **Best Practice 1**: Description
2. **Best Practice 2**: Description

## Performance Impact

[Performance considerations]

## TypeScript Integration

[TypeScript-specific information]

```

## Updating Existing Specs

When updating an existing spec:

1. Keep the existing structure
2. Mark changes with "New in vX.Y.Z" notes
3. Move deprecated information to a "Legacy" section
4. Update examples to follow current best practices

## Conclusion

Well-written specifications are crucial for:

- Helping users understand the rule's purpose
- Reducing the learning curve for new team members
- Maintaining consistency across the codebase
- Providing clear documentation for future maintenance

Remember that the spec is often the first place developers look when they encounter a rule violation, so make it clear, accurate, and helpful.
