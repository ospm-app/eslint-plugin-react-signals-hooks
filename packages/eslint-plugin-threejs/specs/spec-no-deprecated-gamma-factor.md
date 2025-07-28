# No Deprecated Gamma Factor Rule Specification

This rule enforces the use of modern color management practices in Three.js by flagging deprecated gamma-related properties and methods. It helps ensure consistent color rendering across different devices and browsers.

## Core Functionality

This rule detects and reports usage of deprecated gamma-related properties and methods in Three.js, suggesting modern alternatives that use the current color management system.

## Handled Cases

### 1. Deprecated `gammaFactor` Property

Detects and suggests alternatives for the deprecated `gammaFactor` property on materials and renderers.

### 2. Deprecated `gammaInput` Property

Identifies and reports usage of the deprecated `gammaInput` property on renderers.

### 3. Deprecated `gammaOutput` Property

Finds and suggests updates for the deprecated `gammaOutput` property on renderers.

### 4. Legacy `gamma` Property

Detects the legacy `gamma` property and suggests using the current color management system.

## Error Messages

- `deprecatedGammaProperty`: "{{property}} is deprecated. Use the current color management system with {{suggested}} instead."
- `deprecatedGammaMethod`: "{{method}} is deprecated. Use the current color management system with {{suggested}} instead."

## Auto-fix Suggestions

The rule provides auto-fixes that:

1. Replace deprecated gamma properties with their modern equivalents
2. Update color management configuration to use the current API
3. Add necessary imports for color space utilities when needed
4. Preserve any additional material or renderer properties

## Benefits

1. **Color Accuracy**: Ensures consistent color rendering across platforms
2. **Future Compatibility**: Prevents issues when deprecated APIs are removed
3. **Performance**: Modern color management is optimized for current WebGL implementations
4. **Standardization**: Encourages use of the current color management approach

## When to Disable

This rule should only be disabled when:

- Working with legacy code that cannot be updated
- Testing the rule itself
- Specific backward compatibility requirements exist

## Implementation Notes

- The rule specifically targets material and renderer property assignments
- It handles both direct assignments and object spread patterns
- The auto-fix includes proper type checking to avoid false positives
- It provides context-aware suggestions based on the Three.js version in use

## Related Resources

- [Three.js Color Management](https://threejs.org/docs/#manual/en/introduction/Color-management)
- [WebGL Color Space](https://webgl2fundamentals.org/webgl/lessons/webgl-color-spaces.html)
- [sRGB Color Space](https://en.wikipedia.org/wiki/SRGB)
