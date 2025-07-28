# Limit Shadow Casters Rule Specification

This rule enforces best practices for shadow casting in Three.js applications by limiting the number of shadow-casting objects and optimizing their configuration for better performance.

## Core Functionality

This rule helps optimize shadow rendering by identifying and flagging potential performance issues related to shadow casting, such as excessive shadow casters or suboptimal shadow map configurations.

## Handled Cases

### 1. Excessive Shadow Casters

Detects when too many objects are set to cast shadows, which can significantly impact performance.

### 2. Unnecessary Shadow Casting

Identifies objects that are set to cast shadows but are unlikely to be visible in shadow maps.

### 3. Inefficient Shadow Map Sizes

Warns about shadow map sizes that are either too large (wasting memory) or too small (causing artifacts).

### 4. Missing Shadow Camera Configuration

Checks that shadow cameras are properly configured for optimal shadow quality and performance.

## Error Messages

- `tooManyShadowCasters`: "{{count}} objects are set to cast shadows, which may impact performance. Consider reducing the number of shadow casters."
- `unnecessaryShadowCasting`: "This object is unlikely to cast visible shadows. Consider disabling shadow casting for better performance."
- `suboptimalShadowMapSize`: "Shadow map size of {{width}}x{{height}} may be {{issue}}. Recommended size is between 512x512 and 2048x2048 for most use cases."
- `missingShadowCameraConfig`: "Shadow camera is not properly configured. {{suggestion}}."

## Auto-fix Suggestions

The rule provides auto-fixes that:

1. Disable shadow casting on objects where it's not needed
2. Optimize shadow map sizes based on scene requirements
3. Configure shadow cameras with appropriate parameters
4. Add performance optimization comments

## Benefits

1. **Performance**: Reduces GPU load by limiting shadow calculations
2. **Memory**: Optimizes shadow map memory usage
3. **Visual Quality**: Helps maintain good shadow quality
4. **Battery Life**: More efficient on mobile devices

## When to Disable

- When implementing custom shadow management
- For specific artistic requirements
- During development and testing of shadow features

## Implementation Notes

- Analyzes scene graph and material properties
- Considers object size, position, and visibility
- Provides context-aware optimization suggestions
- Respects project-specific configuration

## Related Resources

- [Three.js Shadows](https://threejs.org/docs/#api/en/lights/shadows)
- [Shadow Mapping](https://learnopengl.com/Advanced-Lighting/Shadows/Shadow-Mapping)
- [WebGL Performance](https://webglsamples.org/WebGLBestPractices/performance.html)
