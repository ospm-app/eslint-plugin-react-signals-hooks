# ESLint Rule Specification: prefer-instanced-mesh

## Rule Details

This rule aims to improve rendering performance in Three.js applications by encouraging the use of `InstancedMesh` instead of creating multiple individual `Mesh` instances when rendering identical meshes (same geometry and material). Creating numerous `Mesh` objects can lead to increased data transfer to the GPU and reduced frame rates, as demonstrated in performance comparisons where instancing significantly boosts FPS in scenes with repeated objects.

The rule detects patterns where multiple `Mesh` instances are created with the same geometry and material, particularly in loops or repeated instantiations, and suggests refactoring to `InstancedMesh` for better efficiency.

### Rationale

In Three.js, `InstancedMesh` allows rendering multiple copies of the same mesh in a single draw call, reducing overhead. This is especially beneficial in scenes like voxel-based games or environments with repeated elements (e.g., terrain blocks). Failing to instance can cause performance bottlenecks, as seen in before-and-after comparisons where non-instanced rendering results in lower FPS and choppier animations.

This rule enforces the mantra: "I will always instance my meshes to reduce the amount of data transferred to the GPU to improve rendering performance."

### Options

This rule accepts an options object with the following properties:

- `threshold` (number, default: 5): The minimum number of identical `Mesh` instances required to trigger the rule. Set to a higher value to allow small numbers of meshes without instancing.
- `ignoreDynamic` (boolean, default: false): If true, ignores cases where mesh positions, rotations, or scales are set dynamically after creation, as these might not be easily refactorable to instancing.

Example configuration in `.eslintrc`:

```json
{
  "rules": {
    "threejs/prefer-instanced-mesh": ["error", { "threshold": 10, "ignoreDynamic": true }]
  }
}
```

## Examples

### Incorrect (failing) code

```javascript
import { Mesh, BoxGeometry, MeshStandardMaterial } from 'three';

const geometry = new BoxGeometry(1, 1, 1);
const material = new MeshStandardMaterial({ color: 0x00ff00 });

for (let i = 0; i < 100; i++) {
  const mesh = new Mesh(geometry, material);
  mesh.position.set(i * 2, 0, 0);
  scene.add(mesh);
}
```

**Why it fails:** Multiple `Mesh` instances are created with the same geometry and material in a loop, exceeding the threshold. This should be refactored to use `InstancedMesh`.

### Correct (passing) code

```javascript
import { InstancedMesh, BoxGeometry, MeshStandardMaterial, Matrix4 } from 'three';

const geometry = new BoxGeometry(1, 1, 1);
const material = new MeshStandardMaterial({ color: 0x00ff00 });

const instancedMesh = new InstancedMesh(geometry, material, 100);
const matrix = new Matrix4();

for (let i = 0; i < 100; i++) {
  matrix.setPosition(i * 2, 0, 0);
  instancedMesh.setMatrixAt(i, matrix);
}

scene.add(instancedMesh);
```

**Why it passes:** Uses `InstancedMesh` to handle multiple instances efficiently in a single object.

### Another incorrect example (with dynamic updates)

```javascript
import { Mesh, SphereGeometry, MeshBasicMaterial } from 'three';

const geo = new SphereGeometry(1, 32, 32);
const mat = new MeshBasicMaterial({ color: 0xff0000 });

const meshes = [];
for (let i = 0; i < 20; i++) {
  const mesh = new Mesh(geo, mat);
  meshes.push(mesh);
  scene.add(mesh);
}

// Later in animation loop
meshes.forEach((mesh, i) => {
  mesh.position.x = Math.sin(Date.now() * 0.001 + i);
});
```

**Why it fails:** Even with dynamic updates, if `ignoreDynamic` is false, it flags the repeated creation. Refactor to `InstancedMesh` and update matrices in the loop.

### Another correct example (small number of meshes)

```javascript
import { Mesh, PlaneGeometry, MeshPhongMaterial } from 'three';

const geometry = new PlaneGeometry(10, 10);
const material = new MeshPhongMaterial({ color: 0xcccccc });

const mesh1 = new Mesh(geometry, material);
const mesh2 = new Mesh(geometry, material);
const mesh3 = new Mesh(geometry, material);

scene.add(mesh1, mesh2, mesh3);
```

**Why it passes:** Only 3 instances, below the default threshold of 5.

## When Not to Use It

Disable this rule if:

- Your project does not use Three.js.
- You're targeting environments where instancing is not supported (e.g., older WebGL versions).
- Performance is not a concern, or meshes have unique materials/geometries that cannot be instanced.

## Implementation Notes

This rule would require an ESLint plugin specific to Three.js (e.g., `eslint-plugin-threejs`). It analyzes AST nodes for:

- Imports of `Mesh`, `InstancedMesh`, `Geometry`, and `Material` classes from 'three'.
- Loops or array methods creating multiple `new Mesh()` calls with shared variable references for geometry and material.
- Variable tracking to ensure geometry and material are identical across instances.

Fixer: Could provide an auto-fix to refactor to `InstancedMesh`, but this might be complex due to position/rotation handling.

Related: This rule is inspired by performance best practices in Three.js, as highlighted in community discussions on optimizing WebGPU and WebGL rendering.
