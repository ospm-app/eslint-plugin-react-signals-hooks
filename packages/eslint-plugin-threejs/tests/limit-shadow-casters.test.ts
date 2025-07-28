import * as THREE from 'three';

// Test case 1: Too many shadow casters (should warn)
export function testTooManyShadowCasters() {
  const group = new THREE.Group();

  // Create many shadow-casting objects
  for (let i = 0; i < 100; i++) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
    mesh.castShadow = true; // This would trigger the rule
    group.add(mesh);
  }

  return group;
}

// Test case 2: Unnecessary shadow casting (should warn)
export function testUnnecessaryShadowCasting() {
  // This object is too small to cast visible shadows
  const smallObject = new THREE.Mesh(
    new THREE.SphereGeometry(0.1),
    new THREE.MeshStandardMaterial()
  );
  smallObject.castShadow = true; // This would trigger the rule

  return smallObject;
}

// Test case 3: Suboptimal shadow map size (should warn)
export function testSuboptimalShadowMapSize() {
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.castShadow = true;
  light.shadow.mapSize.width = 4096; // Too large
  light.shadow.mapSize.height = 4096; // Too large

  return light;
}

// Test case 4: Missing shadow camera configuration (should warn)
export function testMissingShadowCameraConfig() {
  const light = new THREE.SpotLight(0xffffff, 1);
  light.castShadow = true;
  // Missing shadow camera configuration

  return light;
}

// Test case 5: Optimized shadow setup (should pass)
export function testOptimizedShadowSetup() {
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.castShadow = true;
  light.shadow.mapSize.width = 1024;
  light.shadow.mapSize.height = 1024;
  light.shadow.camera.near = 0.5;
  light.shadow.camera.far = 500;

  // Only important objects cast shadows
  const importantObject = new THREE.Mesh(
    new THREE.BoxGeometry(5, 5, 5),
    new THREE.MeshStandardMaterial()
  );
  importantObject.castShadow = true;

  // Less important objects don't cast shadows
  const lessImportantObject = new THREE.Mesh(
    new THREE.BoxGeometry(1, 1, 1),
    new THREE.MeshStandardMaterial()
  );
  lessImportantObject.castShadow = false;

  const group = new THREE.Group();
  group.add(light, importantObject, lessImportantObject);
  return group;
}

// Test case 6: Shadow casting in a class (should warn)
export class ShadowCastingScene {
  private light: THREE.DirectionalLight;

  constructor() {
    this.light = new THREE.DirectionalLight(0xffffff, 1);
    this.light.castShadow = true;
    // Missing shadow map size configuration
  }

  createShadowCaster() {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());
    mesh.castShadow = true; // This would trigger the rule
    return mesh;
  }
}

// Test case 7: Shadow casting in a conditional (should warn)
export function testConditionalShadowCasting(shouldCastShadow: boolean) {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshStandardMaterial());

  if (shouldCastShadow) {
    mesh.castShadow = true; // This would trigger the rule
  }

  return mesh;
}

// Test case 8: Proper shadow camera setup (should pass)
export function testProperShadowCameraSetup() {
  const light = new THREE.DirectionalLight(0xffffff, 1);
  light.castShadow = true;
  light.shadow.mapSize.width = 1024;
  light.shadow.mapSize.height = 1024;

  // Configure shadow camera frustum
  light.shadow.camera.near = 0.5;
  light.shadow.camera.far = 500;
  light.shadow.camera.left = -100;
  light.shadow.camera.right = 100;
  light.shadow.camera.top = 100;
  light.shadow.camera.bottom = -100;

  return light;
}

// Test case 9: Shadow casting with proper optimization (should pass)
export function testOptimizedShadowCasting() {
  // Only large, important objects cast shadows
  const largeObject = new THREE.Mesh(
    new THREE.BoxGeometry(10, 10, 10),
    new THREE.MeshStandardMaterial()
  );
  largeObject.castShadow = true;

  // Small or less important objects don't cast shadows
  const smallObject = new THREE.Mesh(
    new THREE.SphereGeometry(0.5),
    new THREE.MeshStandardMaterial()
  );
  smallObject.castShadow = false;

  const group = new THREE.Group();
  group.add(largeObject, smallObject);
  return group;
}

// Test case 10: Shadow casting with proper light configuration (should pass)
export function testProperLightConfiguration() {
  const light = new THREE.SpotLight(0xffffff, 1, 100, Math.PI / 4, 0.5, 1);
  light.castShadow = true;
  light.shadow.mapSize.width = 2048;
  light.shadow.mapSize.height = 2048;
  light.shadow.camera.near = 0.5;
  light.shadow.camera.far = 200;

  // Position and target the light
  light.position.set(10, 20, 10);
  light.target.position.set(0, 0, 0);

  return light;
}
