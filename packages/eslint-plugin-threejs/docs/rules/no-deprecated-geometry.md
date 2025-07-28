# Disallow usage of the deprecated THREE.Geometry class (`@ospm/threejs/no-deprecated-geometry`)

⚠️ This rule is **warn** by default.

<!-- end auto-generated rule header -->

## Rule Details

This rule disallows the use of the deprecated `THREE.Geometry` class, which was removed in Three.js r125. Use `THREE.BufferGeometry` instead for better performance and WebGL compatibility.

## Why is this important?

- `THREE.Geometry` was removed in Three.js r125
- `THREE.BufferGeometry` offers better performance and memory efficiency
- Modern WebGL features and optimizations are only available with `BufferGeometry`
- Using the deprecated class can cause runtime errors in newer Three.js versions

## Examples

### ❌ Incorrect

```javascript
import * as THREE from 'three';

// Using the deprecated THREE.Geometry
const geometry = new THREE.Geometry();
```

### ✅ Correct

```javascript
import * as THREE from 'three';

// Using the recommended THREE.BufferGeometry
const geometry = new THREE.BufferGeometry();
```

## When Not To Use It

If you need to support very old versions of Three.js that don't have `BufferGeometry` (unlikely in modern codebases), you may need to disable this rule. However, consider updating your Three.js version instead.

## Related Resources

- [Three.js Migration Guide: Geometry → BufferGeometry](https://threejs.org/docs/#manual/en/introduction/Legacy-Geometry)
- [Three.js BufferGeometry Documentation](https://threejs.org/docs/#api/en/core/BufferGeometry)
- [Performance Considerations with BufferGeometry](https://threejs.org/docs/#manual/en/introduction/How-to-dispose-of-objects)
