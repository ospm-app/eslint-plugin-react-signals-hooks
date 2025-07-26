import * as THREE from 'three';

// Test case 1: Missing cleanup of clipping planes (should warn)
export function testMissingCleanup() {
  const renderer = new THREE.WebGLRenderer();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  // Enable clipping planes but don't clean up
  renderer.clippingPlanes = [plane];

  return renderer;
}

// Test case 2: Too many clipping planes (should warn)
export function testTooManyClippingPlanes() {
  const renderer = new THREE.WebGLRenderer();
  const planes = [];

  // Create more planes than typical WebGL implementations support
  for (let i = 0; i < 10; i++) {
    planes.push(new THREE.Plane(new THREE.Vector3(0, 1, 0), i));
  }

  renderer.clippingPlanes = planes;
  return renderer;
}

// Test case 3: Inefficient updates in render loop (should warn)
export function testInefficientUpdates() {
  const renderer = new THREE.WebGLRenderer();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  // This would be in an animation loop
  function animate() {
    plane.constant += 0.1; // Changing plane in render loop
    renderer.clippingPlanes = [plane]; // Reassigning array every frame
  }

  return { renderer, animate };
}

// Test case 4: Missing local clipping (should warn)
export function testMissingLocalClipping() {
  const material = new THREE.MeshStandardMaterial();
  // Forgot to enable local clipping
  // material.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)];
  return material;
}

// Test case 5: Proper clipping setup (should pass)
export function testProperClippingSetup() {
  const renderer = new THREE.WebGLRenderer();
  const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

  // Proper setup with cleanup
  renderer.clippingPlanes = [plane];

  // Proper cleanup
  function cleanup() {
    renderer.clippingPlanes = [];
    renderer.dispose();
  }

  return { renderer, cleanup };
}

// Test case 6: Local clipping properly enabled (should pass)
export function testLocalClippingEnabled() {
  const material = new THREE.MeshStandardMaterial({
    clippingPlanes: [new THREE.Plane(new THREE.Vector3(0, 1, 0), 0)],
    // Should warn
    // @ts-expect-error This is a TypeScript type error that occurs because the clipping property isn't part of the constructor parameters for MeshStandardMaterial in the Three.js type definitions. However, it's a valid property that can be set after instantiation.
    clipping: true, // Local clipping enabled
  });
  return material;
}

// Test case 7: Clipping in a class (should warn)
export class ClippingExample {
  private renderer: THREE.WebGLRenderer;
  private plane: THREE.Plane;

  constructor() {
    this.renderer = new THREE.WebGLRenderer();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.renderer.clippingPlanes = [this.plane];

    // Missing cleanup in class
  }

  // Missing cleanup method
}

// Test case 8: Clipping in a conditional (should warn)
export function testConditionalClipping(enableClipping: boolean) {
  const renderer = new THREE.WebGLRenderer();

  if (enableClipping) {
    const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    renderer.clippingPlanes = [plane];
    // Missing cleanup when disabling
  }

  return renderer;
}

// Test case 9: Multiple renderers with clipping (should warn)
export function testMultipleRenderers() {
  const renderers = [];

  for (let i = 0; i < 5; i++) {
    const renderer = new THREE.WebGLRenderer();
    renderer.clippingPlanes = [new THREE.Plane(new THREE.Vector3(0, 1, 0), i)];
    renderers.push(renderer);

    // Missing cleanup for each renderer
  }

  return renderers;
}

// Test case 10: Proper cleanup in a class (should pass)
export class ProperClippingExample {
  private renderer: THREE.WebGLRenderer;
  private plane: THREE.Plane;

  constructor() {
    this.renderer = new THREE.WebGLRenderer();
    this.plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this.renderer.clippingPlanes = [this.plane];
  }

  public dispose() {
    // Proper cleanup
    this.renderer.clippingPlanes = [];
    this.renderer.dispose();
  }
}
