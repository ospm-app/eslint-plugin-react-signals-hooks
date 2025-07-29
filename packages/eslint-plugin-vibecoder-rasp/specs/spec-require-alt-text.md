# Require Alt Text Rule Specification

Ensures that all relevant elements have appropriate alternative text, making web content accessible to users who rely on screen readers.

## Core Functionality

This rule verifies that elements requiring alternative text (like `img`, `area`, and `input[type="image"]`) have appropriate `alt` attributes or alternative text mechanisms in place.

## Handled Cases

### 1. Image Elements

- Requires `alt` attribute on `img` elements
- Validates `alt` text is not empty when required
- Handles self-closing and non-self-closing tags

### 2. Interactive Elements

- Validates `area` elements in image maps
- Checks `input[type="image"]` elements
- Handles dynamic and conditional rendering

### 3. ARIA Attributes

- Validates `aria-label` and `aria-labelledby`
- Checks for `title` attributes as fallbacks
- Handles `role="img"` and other relevant ARIA roles

## Error Messages

- `missingAltText": "Missing alt text for {{element}}."
- `emptyAltText": "Empty alt text on {{element}}. Use alt=\"\" for decorative images."
- `redundantAltText": "Redundant alt text. Screen readers already announce {{element}} elements."
- `suspiciousAltText": "Suspicious alt text '{{text}}' on {{element}}. Make sure it describes the image."

## Auto-fix Suggestions

- Adds empty `alt` attribute to decorative images
- Suggests descriptive alt text for meaningful images
- Removes redundant alt text when unnecessary
- Preserves existing attributes and formatting

## Benefits

1. **Accessibility**: Makes content accessible to screen reader users
2. **Better UX**: Provides fallback text when images don't load
3. **SEO Benefits**: Helps search engines understand image content
4. **Legal Compliance**: Meets accessibility standards (WCAG)

## When to Disable

- For purely decorative images with no semantic meaning
- When using custom image components that handle alt text internally
- In test files and documentation examples

## Configuration

```json
{
  "require-alt-text": ["error", {
    "elements": ["img", "object", "area", "input[type=\"image\"]"],
    "img": {
      "enforceAlt": true,
      "allowEmptyAlt": true,
      "allowDecorative": true
    },
    "object": {
      "enforceAlt": true,
      "allowAria": true
    },
    "area": {
      "enforceAlt": true,
      "allowEmptyAlt": false
    },
    "input": {
      "enforceAlt": true,
      "allowTitle": false
    },
    "ignorePatterns": ["^Test", "\\.test\\."]
  }]
}
```

### Options

- `elements`: Array of elements to check (default: ["img", "object", "area", "input[type=\"image\"]"])
- `img.enforceAlt`: Enforce alt text for images (default: true)
- `img.allowEmptyAlt`: Allow empty alt text for decorative images (default: true)
- `img.allowDecorative`: Allow `role="presentation"` for decorative images (default: true)
- `object.enforceAlt`: Enforce alt text for object elements (default: true)
- `object.allowAria`: Allow ARIA labels as alternative to alt (default: true)
- `area.enforceAlt`: Enforce alt text for area elements (default: true)
- `area.allowEmptyAlt`: Allow empty alt text for area elements (default: false)
- `input.enforceAlt`: Enforce alt text for input[type="image"] (default: true)
- `input.allowTitle`: Allow title attribute as fallback (default: false)
- `ignorePatterns`: Array of regex patterns for files to ignore

## Best Practices

1. **Be Descriptive**: Alt text should convey the purpose of the image
2. **Keep It Concise**: Typically 125 characters or less
3. **Don't Say "Image of"**: Screen readers already announce it's an image
4. **Use Empty Alt for Decorative**: `alt=""` for purely decorative images
5. **Test with Screen Readers**: Verify how your alt text sounds

## Performance Impact

- No runtime impact
- Minimal build-time overhead
- Helps prevent accessibility-related performance issues

## TypeScript Integration

- Validates TypeScript types for alt text props
- Handles React's JSX.IntrinsicElements
- Works with custom component props
- Integrates with React's type system
