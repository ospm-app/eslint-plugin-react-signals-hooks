// oxlint-disable no-unused-vars
/** biome-ignore-all lint/correctness/noUnusedPrivateClassMembers: not relevant */
/** biome-ignore-all lint/correctness/noUnusedVariables: not relevant */
/** biome-ignore-all lint/suspicious/noImplicitAnyLet: not relevant */
/** biome-ignore-all lint/complexity/noStaticOnlyClass: not relevant */
import * as THREE from 'three';

// Test case 1: Basic THREE.Geometry usage (should fail)
export function testBasicGeometryUsage() {
  // Incorrect: Using deprecated THREE.Geometry
  // @ts-expect-error
  const geometry = new THREE.Geometry();
  const mesh = new THREE.Mesh(geometry);
  return mesh;
}

// Test case 2: Destructured import of Geometry (should fail)
export function testDestructuredImport() {
  // Incorrect: Using Geometry from destructured import
  // @ts-expect-error
  const { Geometry } = THREE;
  const geometry = new Geometry();
  const mesh = new THREE.Mesh(geometry);
  return mesh;
}

// Test case 3: Aliased THREE import (should fail)
export function testAliasedImport() {
  // Incorrect: Using aliased import
  const ThreeJS = THREE;
  // @ts-expect-error
  const geometry = new ThreeJS.Geometry();

  const mesh = new THREE.Mesh(geometry);

  return mesh;
}

// Test case 4: Multiple Geometry instances (should fail)
export function testMultipleGeometryInstances() {
  // Incorrect: Multiple deprecated Geometry usages
  // @ts-expect-error
  const geometry1 = new THREE.Geometry();
  // @ts-expect-error
  const geometry2 = new THREE.Geometry();
  const mesh1 = new THREE.Mesh(geometry1);
  const mesh2 = new THREE.Mesh(geometry2);
  return [mesh1, mesh2];
}

// Test case 5: With existing BufferGeometry import (should fail but show correct fix)
export function testWithBufferGeometryImport() {
  // Incorrect: Using Geometry when BufferGeometry is already imported
  // @ts-expect-error
  const { Geometry, BufferGeometry } = THREE;
  const geometry = new Geometry();
  const mesh = new THREE.Mesh(geometry);
  return mesh;
}

// Test case 6: Correct BufferGeometry usage (should pass)
export function testCorrectBufferGeometryUsage() {
  // Correct: Using BufferGeometry
  const geometry = new THREE.BufferGeometry();
  const mesh = new THREE.Mesh(geometry);
  return mesh;
}

// Test case 7: Geometry as property name (should pass)
export function testGeometryAsPropertyName() {
  // Correct: Using Geometry as a property name, not as a constructor
  const obj = { Geometry: 'some value' };
  return obj;
}

// Test case 8: Geometry in comments (should pass)
export function testGeometryInComments() {
  /*
   * This is a comment about THREE.Geometry
   * It should not trigger the rule
   */
  const geometry = new THREE.BufferGeometry();
  return new THREE.Mesh(geometry);
}

// Test case 9: Geometry in strings (should pass)
export function testGeometryInStrings() {
  const message = 'This is a string containing THREE.Geometry';
  const geometry = new THREE.BufferGeometry();
  return new THREE.Mesh(geometry);
}

// Test case 10: Using Geometry from a different module (should pass)
// @ts-expect-error
import { Geometry as OtherGeometry } from 'some-other-module';

export function testGeometryFromOtherModule() {
  const geometry = new OtherGeometry();
  return new THREE.Mesh(geometry);
}

// Test case 11: Using THREE.Geometry in a nested scope (should fail)
export function testNestedGeometryUsage() {
  function createGeometry() {
    // Incorrect: Using deprecated THREE.Geometry in nested scope
    // @ts-expect-error
    return new THREE.Geometry();
  }

  return new THREE.Mesh(createGeometry());
}

// Test case 12: Using Geometry in a class (should fail)
export class TestClass {
  createMesh() {
    // Incorrect: Using deprecated THREE.Geometry in class method
    // @ts-expect-error
    const geometry = new THREE.Geometry();
    return new THREE.Mesh(geometry);
  }
}

// Test case 13: Using Geometry in a variable declaration (should fail)
export const testVariableDeclaration = () => {
  // Incorrect: Using deprecated THREE.Geometry in arrow function
  // @ts-expect-error
  const geometry = new THREE.Geometry();
  return new THREE.Mesh(geometry);
};

// Test case 14: Using Geometry in a callback (should fail)
function testCallbackUsage(callback: () => void) {
  callback();
}

testCallbackUsage(() => {
  // Incorrect: Using deprecated THREE.Geometry in callback
  // @ts-expect-error
  const geometry = new THREE.Geometry();
  new THREE.Mesh(geometry);
});

// Test case 15: Using Geometry in a constructor (should fail)
export class SceneWithGeometry {
  private mesh: THREE.Mesh;

  constructor() {
    // Incorrect: Using deprecated THREE.Geometry in constructor
    // @ts-expect-error
    const geometry = new THREE.Geometry();
    this.mesh = new THREE.Mesh(geometry);
  }
}

// Test case 16: Using Geometry in a getter (should fail)
export class GeometryHolder {
  get geometry() {
    // Incorrect: Using deprecated THREE.Geometry in getter
    // @ts-expect-error
    return new THREE.Geometry();
  }
}

// Test case 17: Using Geometry in a setter (should fail)
export class MeshHolder {
  // @ts-expect-error
  private _geometry: THREE.Geometry | null = null;

  // @ts-expect-error
  set geometry(geom: THREE.Geometry) {
    this._geometry = geom;
  }

  setGeometry() {
    // Incorrect: Using deprecated THREE.Geometry in method
    // @ts-expect-error
    this.geometry = new THREE.Geometry();
  }
}

// Test case 18: Using Geometry in a static method (should fail)
export class GeometryFactory {
  static createGeometry() {
    // Incorrect: Using deprecated THREE.Geometry in static method
    // @ts-expect-error
    return new THREE.Geometry();
  }
}

// Test case 19: Using Geometry in a try-catch block (should fail)
export function testTryCatch() {
  try {
    // Incorrect: Using deprecated THREE.Geometry in try block
    // @ts-expect-error
    const geometry = new THREE.Geometry();
    return new THREE.Mesh(geometry);
  } catch (e) {
    console.error(e);
    return null;
  }
}

// Test case 20: Using Geometry in a conditional (should fail)
export function testConditional(useGeometry: boolean) {
  let geometry;

  if (useGeometry) {
    // Incorrect: Using deprecated THREE.Geometry in conditional
    // @ts-expect-error
    geometry = new THREE.Geometry();
  } else {
    geometry = new THREE.BufferGeometry();
  }
  return new THREE.Mesh(geometry);
}
