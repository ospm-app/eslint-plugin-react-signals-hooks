# Keyboard Accessibility Rule Specification

Ensures all interactive elements are keyboard accessible, making web applications usable for keyboard-only users and those who rely on assistive technologies.

## Core Functionality

This rule verifies that all interactive elements can be operated using a keyboard alone, following WCAG 2.1 guidelines for keyboard accessibility.

## Handled Cases

### 1. Interactive Elements

- Requires keyboard event handlers for custom interactive elements
- Validates `onClick` handlers have keyboard equivalents
- Checks for proper tab order and focus management

### 2. Focus Management

- Ensures focus is properly managed in modals and dialogs
- Validates `tabIndex` usage
- Checks for keyboard traps

### 3. ARIA Attributes

- Validates `role` attributes for custom interactive elements
- Ensures proper `aria-*` attributes are present
- Checks for appropriate keyboard interaction patterns

## Error Messages

- `missingKeyboardHandler": "Interactive element '{{element}}' must have a keyboard event handler."
- `missingTabIndex": "Interactive element '{{element}}' must be focusable with a tabindex of 0 or -1."
- `keyboardTrap": "Keyboard focus is trapped in '{{element}}'. Ensure users can navigate away with the keyboard."
- `missingAriaRole": "Interactive element '{{element}}' must have an appropriate ARIA role."

## Auto-fix Suggestions

- Adds `onKeyDown` or `onKeyUp` handlers for clickable elements
- Adds proper `tabIndex` values
- Suggests appropriate ARIA attributes
- Preserves existing event handlers and props

## Benefits

1. **Accessibility**: Makes applications usable for keyboard-only users
2. **Better UX**: Improves navigation for all users
3. **Legal Compliance**: Meets WCAG 2.1 accessibility standards
4. **Broader Reach**: Supports users with motor impairments

## When to Disable

- For elements that are purely presentational
- When using third-party components with known accessibility issues
- In test files and documentation examples

## Configuration

```json
{
  "keyboard-accessibility": ["error", {
    "interactiveElements": [
      "button",
      "a[href]",
      "input",
      "select",
      "textarea",
      "[role=\"button\"]",
      "[role=\"link\"]",
      "[role=\"checkbox\"]",
      "[role=\"radio\"]",
      "[role=\"tab\"]",
      "[role=\"menuitem\"]"
    ],
    "requireKeyEvents": ["onClick", "onMouseDown", "onMouseUp"],
    "keyboardEvents": ["onKeyDown", "onKeyUp", "onKeyPress"],
    "tabbableRoles": [
      "button",
      "link",
      "checkbox",
      "menuitem",
      "menuitemcheckbox",
      "menuitemradio",
      "option",
      "radio",
      "switch",
      "tab",
      "textbox"
    ],
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `interactiveElements`: Array of CSS selectors for interactive elements
- `requireKeyEvents`: Array of mouse events that require keyboard equivalents
- `keyboardEvents`: Array of valid keyboard events
- `tabbableRoles`: Array of ARIA roles that should be keyboard focusable
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Keyboard Navigation**: Ensure all interactive elements are reachable via keyboard
2. **Focus Indicators**: Provide visible focus styles for all focusable elements
3. **Logical Order**: Maintain a logical tab order that follows the visual flow
4. **Skip Links**: Include skip links to bypass repetitive content
5. **Test with Keyboard**: Regularly test your application using only the keyboard

## Performance Impact

- No runtime impact in production
- Minimal build-time overhead
- Helps prevent accessibility-related performance issues

## TypeScript Integration

- Validates TypeScript types for event handlers
- Handles React's SyntheticEvent types
- Works with custom component props
- Integrates with React's type system
