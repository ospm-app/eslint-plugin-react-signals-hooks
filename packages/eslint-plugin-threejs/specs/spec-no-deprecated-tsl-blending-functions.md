# No Deprecated TSL Blending Functions Rule Specification

This rule enforces the use of modern Three.js shader material blending functions instead of deprecated ones. It helps maintain compatibility with the latest Three.js versions and ensures optimal rendering performance.

## Core Functionality

This rule detects and reports usage of deprecated blending functions in Three.js shader materials. It provides suggestions for modern alternatives that should be used instead.

## Handled Cases

### 1. Deprecated AdditiveBlending Usage

Detects and suggests alternatives for the deprecated `THREE.AdditiveBlending` constant.

### 2. Deprecated SubtractiveBlending Usage

Identifies and reports usage of the deprecated `THREE.SubtractiveBlending` constant.

### 3. Deprecated MultiplyBlending Usage

Finds and suggests updates for the deprecated `THREE.MultiplyBlending` constant.

### 4. Deprecated CustomBlending with Legacy Functions

Detects custom blending setups using deprecated functions and suggests modern equivalents.

## Error Messages

- `deprecatedBlendingFunction`: "THREE.{{name}} is deprecated. Use {{replacement}} instead for better compatibility and performance."

## Auto-fix Suggestions

The rule provides auto-fixes that:

1. Replace deprecated blending constants with their modern equivalents
2. Update custom blending configurations to use modern function names
3. Preserve any additional material properties and their formatting

## Benefits

1. **Compatibility**: Ensures code works with modern versions of Three.js
2. **Performance**: Modern blending functions are optimized for current WebGL implementations
3. **Future-Proofing**: Prevents issues when deprecated APIs are removed
4. **Consistency**: Encourages use of standardized blending approaches

## When to Disable

This rule should only be disabled when working with legacy code that cannot be updated or when testing the rule itself.

## Implementation Notes

- The rule specifically targets material blending property assignments
- It handles both direct assignments and object spread patterns
- The auto-fix preserves any additional material properties
- It includes proper type checking to avoid false positives

## Related Resources

- [Three.js Material Blending Documentation](https://threejs.org/docs/#api/en/constants/Materials)
- [WebGL Blend Functions](https://developer.mozilla.org/en-US/docs/Web/API/WebGLRenderingContext/blendFunc)
