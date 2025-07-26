# Prefer GPU Animation Rule Specification

This rule enforces the use of GPU-accelerated animation techniques in Three.js applications, improving performance by offloading animation calculations to the GPU when possible.

## Core Functionality

This rule detects CPU-based animation patterns and suggests GPU-accelerated alternatives, such as using shaders, instancing, or morph targets instead of updating object properties in the render loop.

## Handled Cases

### 1. Direct Property Updates in Animation Loop

Detects direct updates to position, rotation, or scale in animation loops.

### 2. Inefficient Object Transformations

Identifies patterns that could be optimized with matrix operations.

### 3. CPU-based Particle Systems

Flags CPU-updated particle systems that could use GPU instancing.

### 4. Non-optimized Animation Mixers

Detects suboptimal use of animation mixers.

## Error Messages

- `preferGpuAnimation`: "CPU-based animation detected. Consider using {{suggestion}} for better performance."
- `inefficientTransformation`: "Inefficient transformation detected. {{suggestion}}."

## Auto-fix Suggestions

The rule provides auto-fixes that:

1. Suggest GPU-accelerated alternatives
2. Add performance optimization comments
3. Preserve existing functionality while improving performance

## Benefits

1. **Performance**: Reduces CPU load and improves frame rates
2. **Battery Life**: More efficient on mobile devices
3. **Scalability**: Better handling of complex scenes
4. **Smoothness**: More consistent animation frame rates

## When to Disable

- When precise CPU control is necessary
- During development or debugging
- For simple scenes where optimization isn't critical

## Implementation Notes

- Analyzes animation loops and update functions
- Provides context-aware suggestions
- Considers scene complexity

## Related Resources

- [Three.js Performance Tips](https://threejs.org/docs/#manual/en/introduction/How-to-dispose-of-objects)
- [WebGL Best Practices](https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices)
- [WebGL Performance](https://webglsamples.org/WebGLBestPractices/performance.html)
