# ARIA Attributes Rule Specification

Ensures proper use of ARIA (Accessible Rich Internet Applications) attributes for custom interactive components, enhancing accessibility for users of assistive technologies.

## Core Functionality

This rule verifies that custom interactive components have the appropriate ARIA attributes to ensure they are properly announced and operable by screen readers and other assistive technologies.

## Handled Cases

### 1. Required ARIA Attributes

- Validates required attributes for common ARIA roles
- Ensures `aria-*` attributes match their expected values
- Handles dynamic and conditional attributes

### 2. Role Verification

- Ensures custom interactive elements have appropriate `role` attributes
- Validates role-attribute relationships
- Checks for redundant or conflicting roles

### 3. State and Properties

- Validates ARIA state attributes (`aria-expanded`, `aria-pressed`, etc.)
- Ensures proper use of `aria-label` and `aria-labelledby`
- Checks for required parent/child role relationships

## Error Messages

- `missingAriaAttribute": "'{{element}}' with role '{{role}}' is missing required attribute '{{attribute}}'."
- `invalidAriaValue": "Invalid value '{{value}}' for ARIA attribute '{{attribute}}' on '{{element}}'."
- `redundantRole": "Redundant role '{{role}}' on '{{element}}'. This role is already implied by the element type."
- `missingParentRole": "'{{role}}' must be a child of a '{{requiredParent}}'."

## Auto-fix Suggestions

- Adds missing required ARIA attributes
- Fixes invalid ARIA attribute values
- Removes redundant roles
- Suggests appropriate ARIA patterns

## Benefits

1. **Accessibility**: Ensures components are properly announced by screen readers
2. **Better UX**: Improves experience for users of assistive technologies
3. **Legal Compliance**: Helps meet WCAG 2.1 accessibility standards
4. **Developer Guidance**: Educates developers about proper ARIA usage

## When to Disable

- For third-party components with known ARIA issues
- In test files and documentation examples
- When using custom elements that handle ARIA internally

## Configuration

```json
{
  "aria-attributes": ["error", {
    "requiredAttributes": {
      "button": ["aria-label", "aria-labelledby", "aria-pressed"],
      "checkbox": ["aria-checked"],
      "combobox": ["aria-expanded", "aria-controls", "aria-activedescendant"],
      "dialog": ["aria-modal", "aria-label", "aria-labelledby"],
      "menuitem": ["aria-haspopup", "aria-expanded"],
      "radio": ["aria-checked"],
      "slider": ["aria-valuemin", "aria-valuemax", "aria-valuenow"],
      "tab": ["aria-selected", "aria-controls"],
      "textbox": ["aria-multiline", "aria-required", "aria-invalid"]
    },
    "allowEmptyLabels": false,
    "validateRoleValues": true,
    "validateAriaProps": true,
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `requiredAttributes`: Object mapping ARIA roles to their required attributes
- `allowEmptyLabels`: Allow empty ARIA labels (default: false)
- `validateRoleValues`: Validate that role values are valid ARIA roles (default: true)
- `validateAriaProps`: Validate that ARIA props are valid (default: true)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Use Native Elements**: Prefer native HTML elements with built-in accessibility
2. **Test with Screen Readers**: Verify ARIA implementation with actual assistive technologies
3. **Keep It Simple**: Only use ARIA when necessary
4. **Follow Patterns**: Use established ARIA design patterns
5. **Document Complex Components**: Add comments explaining ARIA usage in complex cases

## Performance Impact

- No runtime impact
- Minimal build-time overhead
- Helps prevent accessibility-related performance issues

## TypeScript Integration

- Validates TypeScript types for ARIA attributes
- Works with React's JSX.IntrinsicElements
- Handles custom component props with ARIA attributes
- Integrates with React's type system
