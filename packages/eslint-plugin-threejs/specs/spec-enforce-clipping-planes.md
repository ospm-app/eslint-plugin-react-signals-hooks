# Enforce Clipping Planes Rule Specification

This rule ensures proper implementation and usage of clipping planes in Three.js applications, helping to prevent common issues and optimize rendering performance.

## Core Functionality

This rule enforces best practices for using clipping planes in Three.js, including proper setup, configuration, and cleanup to prevent memory leaks and rendering artifacts.

## Handled Cases

### 1. Missing Clipping Plane Cleanup

Detects when clipping planes are not properly removed or disabled, which can cause memory leaks.

### 2. Excessive Number of Clipping Planes

Warns when the number of active clipping planes exceeds WebGL/device limits.

### 3. Inefficient Clipping Plane Updates

Identifies patterns where clipping planes are updated unnecessarily in the render loop.

### 4. Missing Local Clipping

Checks that materials have local clipping enabled when using local clipping planes.

## Error Messages

- `missingCleanup`: "Clipping planes should be properly removed when no longer needed to prevent memory leaks."
- `tooManyPlanes": "Using {{count}} clipping planes may exceed device limits. Consider reducing the number of active planes."
- `inefficientUpdate": "Avoid updating clipping planes in the render loop. {{suggestion}}."
- `enableLocalClipping": "Material.localClipping should be true when using local clipping planes."

## Auto-fix Suggestions

The rule provides auto-fixes that:

1. Add proper cleanup code for clipping planes
2. Optimize clipping plane updates
3. Enable local clipping on materials when needed
4. Add appropriate comments and documentation

## Benefits

1. **Performance**: Prevents unnecessary rendering passes and updates
2. **Memory**: Ensures proper cleanup of WebGL resources
3. **Compatibility**: Avoids exceeding device limits
4. **Visual Quality**: Prevents clipping artifacts

## When to Disable

- When implementing custom clipping plane management
- For advanced use cases with specific requirements
- During development and testing of clipping functionality

## Implementation Notes

- Analyzes material and renderer configurations
- Tracks clipping plane lifecycle
- Considers both global and local clipping planes
- Provides context-aware suggestions

## Related Resources

- [Three.js Clipping Planes](https://threejs.org/docs/#api/en/renderers/WebGLRenderer.clippingPlanes)
- [WebGL Clipping](https://webglfundamentals.org/webgl/lessons/webgl-clipping.html)
- [WebGL Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
