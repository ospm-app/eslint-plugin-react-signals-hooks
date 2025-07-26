# No Deprecated Geometry Rule Specification

This rule enforces the use of `THREE.BufferGeometry` instead of the deprecated `THREE.Geometry` class. The legacy `THREE.Geometry` class was removed in Three.js r125 and should be replaced with `THREE.BufferGeometry` for better performance and WebGL compatibility.

## Core Functionality

This rule detects and reports any usage of the deprecated `THREE.Geometry` constructor. It provides an auto-fix that replaces `THREE.Geometry` with `THREE.BufferGeometry`.

## Handled Cases

### 1. Basic THREE.Geometry Usage

Detects direct instantiation of `THREE.Geometry` through the THREE namespace.

### 2. Destructured Import of Geometry

Detects usage when `Geometry` is imported directly from 'three' and used as a constructor.

### 3. Aliased THREE Import

Detects usage when the THREE import is aliased (e.g., `import * as ThreeJS from 'three'`).

### 4. Multiple Geometry Instances

Handles multiple instances of `THREE.Geometry` in the same file.

### 5. With Existing BufferGeometry Import

Properly handles files that already import `BufferGeometry`.

## Error Messages

- `deprecatedGeometry`: "THREE.Geometry is deprecated. Use THREE.BufferGeometry instead for better performance and WebGL compatibility."

## Auto-fix Suggestions

The rule provides an auto-fix that:

1. Replaces `new THREE.Geometry()` with `new THREE.BufferGeometry()`
2. Updates imports to use `BufferGeometry` instead of `Geometry` when applicable
3. Handles multiple instances in the same file
4. Preserves any existing imports and their formatting

## Benefits

1. **Compatibility**: Ensures code works with modern versions of Three.js
2. **Performance**: `BufferGeometry` offers better performance than the legacy `Geometry`
3. **WebGL Compatibility**: Modern WebGL features work better with `BufferGeometry`
4. **Future-Proofing**: Prevents issues when older APIs are removed

## When to Disable

This rule should only be disabled when working with legacy code that cannot be updated to use `BufferGeometry` or when testing the rule itself.

## Implementation Notes

- The rule specifically targets constructor calls to `THREE.Geometry`
- It does not flag `Geometry` used as a property name or in strings/comments
- The auto-fix handles import statements when `Geometry` is directly imported

## Related Resources

- [Three.js Migration Guide](https://github.com/mrdoob/three.js/wiki/Migration-Guide#r125--20210601)
- [THREE.Geometry Documentation](https://threejs.org/docs/#api/en/core/Geometry)
