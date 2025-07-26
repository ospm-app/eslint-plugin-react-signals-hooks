import * as THREE from 'three';

// Test case 1: Deprecated AdditiveBlending (should warn)
export function testDeprecatedAdditiveBlending() {
  const material = new THREE.MeshStandardMaterial();
  material.blending = THREE.AdditiveBlending; // This would trigger the rule
  return material;
}

// Test case 2: Deprecated SubtractiveBlending (should warn)
export function testDeprecatedSubtractiveBlending() {
  const material = new THREE.MeshStandardMaterial();
  material.blending = THREE.SubtractiveBlending; // This would trigger the rule
  return material;
}

// Test case 3: Deprecated MultiplyBlending (should warn)
export function testDeprecatedMultiplyBlending() {
  const material = new THREE.MeshStandardMaterial();
  material.blending = THREE.MultiplyBlending; // This would trigger the rule
  return material;
}

// Test case 4: Deprecated custom blending (should warn)
export function testDeprecatedCustomBlending() {
  const material = new THREE.MeshStandardMaterial();
  material.blending = THREE.CustomBlending;
  material.blendSrc = THREE.SrcAlphaFactor; // Deprecated
  material.blendDst = THREE.OneMinusSrcAlphaFactor; // Deprecated
  material.blendEquation = THREE.AddEquation; // Deprecated
  return material;
}

// Test case 5: Modern blending (should pass)
export function testModernBlending() {
  const material = new THREE.MeshStandardMaterial();
  material.blending = THREE.CustomBlending;
  // @ts-expect-error
  material.blendSrc = THREE.SRC_ALPHA;
  // @ts-expect-error
  material.blendDst = THREE.ONE_MINUS_SRC_ALPHA;
  material.blendEquation = THREE.AddEquation;
  return material;
}

// Test case 6: No blending (should pass)
export function testNoBlending() {
  const material = new THREE.MeshStandardMaterial();
  material.blending = THREE.NoBlending;
  return material;
}

// Test case 7: Normal blending (should pass)
export function testNormalBlending() {
  const material = new THREE.MeshStandardMaterial();
  material.blending = THREE.NormalBlending;
  return material;
}

// Test case 8: Blending in a class (should warn)
export class MaterialWithDeprecatedBlending {
  createMaterial() {
    const material = new THREE.MeshStandardMaterial();
    material.blending = THREE.AdditiveBlending; // This would trigger the rule
    return material;
  }
}

// Test case 9: Blending in a conditional (should warn)
export function testConditionalBlending(useDeprecated: boolean) {
  const material = new THREE.MeshStandardMaterial();

  if (useDeprecated) {
    material.blending = THREE.MultiplyBlending; // This would trigger the rule
  } else {
    material.blending = THREE.NormalBlending;
  }

  return material;
}

// Test case 10: Blending with object spread (should warn)
export function testBlendingWithSpread() {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    blending: THREE.AdditiveBlending, // This would trigger the rule
    transparent: true,
  });

  return material;
}

// Test case 11: Blending with destructured import (should warn)
export function testBlendingWithDestructuredImport() {
  const { AdditiveBlending } = THREE;
  const material = new THREE.MeshStandardMaterial();
  material.blending = AdditiveBlending; // This would trigger the rule
  return material;
}

// Test case 12: Blending with aliased import (should warn)
export function testBlendingWithAliasedImport() {
  const ThreeJS = THREE;
  const material = new ThreeJS.MeshStandardMaterial();
  material.blending = ThreeJS.AdditiveBlending; // This would trigger the rule
  return material;
}

// Test case 13: Custom blending with modern functions (should pass)
export function testModernCustomBlending() {
  const material = new THREE.MeshStandardMaterial();
  material.blending = THREE.CustomBlending;
  // @ts-expect-error
  material.blendSrc = THREE.SRC_ALPHA_SATURATE;
  // @ts-expect-error
  material.blendDst = THREE.ONE;

  material.blendEquation = THREE.ReverseSubtractEquation;
  // @ts-expect-error
  material.blendSrcAlpha = THREE.ONE;
  // @ts-expect-error
  material.blendDstAlpha = THREE.ONE;
  material.blendEquationAlpha = THREE.MaxEquation;
  return material;
}

// Test case 14: Blending with computed property names (should warn)
export function testBlendingWithComputedProperty() {
  const blendType = 'AdditiveBlending';
  const material = new THREE.MeshStandardMaterial();
  material.blending = THREE[blendType]; // This would trigger the rule
  return material;
}

// Test case 15: Blending in a try-catch block (should warn)
export function testBlendingInTryCatch() {
  const material = new THREE.MeshStandardMaterial();

  try {
    material.blending = THREE.AdditiveBlending; // This would trigger the rule
  } catch (e) {
    console.error(e);
  }

  return material;
}

// Test case 16: Additional deprecated blend factors (should warn)
export function testAdditionalDeprecatedBlendFactors() {
  const material = new THREE.ShaderMaterial();

  material.blendSrc = THREE.SrcColorFactor; // Deprecated

  material.blendDst = THREE.OneMinusDstColorFactor; // Deprecated
  return material;
}

// Test case 17: TypeScript type references (should warn)
export function testTypeScriptTypeReferences() {
  // This would trigger the rule for type references
  type DeprecatedBlendingType = typeof THREE.AdditiveBlending;

  interface MaterialWithDeprecatedBlending extends THREE.Material {
    blending: typeof THREE.MultiplyBlending; // Should warn
  }

  return {
    DeprecatedBlendingType: {} as DeprecatedBlendingType,
    material: {} as MaterialWithDeprecatedBlending,
  };
}

// Test case 18: TypeScript type aliases with deprecated blending
export type DeprecatedBlendingAlias = typeof THREE.SubtractiveBlending;

export function testTypeAlias() {
  const material = new THREE.MeshStandardMaterial();

  // @ts-expect-error
  material.blending = {}; // Should warn
  return material;
}

// Test case 19: Object spread with nested objects (should warn)
export function testNestedObjectSpread() {
  const blendingConfig = {
    blending: THREE.AdditiveBlending, // Should warn
    options: {
      transparent: true,
      alphaTest: 0.5,
    },
  };

  const material = new THREE.MeshStandardMaterial({
    color: 0xff0000,
    ...blendingConfig,
    opacity: 0.8,
  });

  return material;
}

// Test case 20: Dynamic property access (should warn)
export function testDynamicPropertyAccess() {
  const material = new THREE.MeshStandardMaterial();
  const blendType = 'AdditiveBlending';

  material.blending = THREE[blendType]; // Should warn
  return material;
}

// Test case 21: Function that returns a blending mode (should warn)
function getDeprecatedBlending() {
  return THREE.MultiplyBlending; // Should warn in return type
}

export function testFunctionReturn() {
  const material = new THREE.MeshStandardMaterial();
  material.blending = getDeprecatedBlending(); // Should warn
  return material;
}

// Test case 22: Class with deprecated blending in constructor
class MaterialWithDeprecatedBlendingInConstructor {
  material: THREE.Material;

  constructor() {
    this.material = new THREE.MeshStandardMaterial({
      blending: THREE.AdditiveBlending, // Should warn
    });
  }
}

export function testClassWithDeprecatedBlending() {
  return new MaterialWithDeprecatedBlendingInConstructor();
}

// Test case 23: Type assertion with deprecated blending (should warn)
export function testTypeAssertion() {
  const material = new THREE.MeshStandardMaterial();

  // @ts-expect-error
  material.blending = 'AdditiveBlending'; // Should warn if type information is available

  return material;
}

// Test case 24: TypeScript interface with deprecated blending
interface CustomMaterial extends THREE.Material {
  customBlending: typeof THREE.SubtractiveBlending; // Should warn
}

export function testInterfaceWithDeprecatedBlending(): CustomMaterial {
  return {
    customBlending: THREE.SubtractiveBlending,
    // Other required Material properties
    type: 'Material',
    uuid: 'test',
    name: '',
    // @ts-expect-error - Mock implementation
    clone: () => ({}),
    // @ts-expect-error - Mock implementation
    copy: () => ({}),

    dispose: () => {},

    onBeforeCompile: () => {},

    customProgramCacheKey: () => '',

    setValues: () => {},
  };
}

// Test case 25: Multiple deprecated properties in object literal (should warn for each)
export function testMultipleDeprecatedProperties() {
  return new THREE.MeshStandardMaterial({
    blending: THREE.AdditiveBlending, // Should warn

    blendSrc: THREE.SrcAlphaFactor, // Should warn

    blendDst: THREE.OneMinusSrcAlphaFactor, // Should warn
    transparent: true,
    opacity: 0.8,
  });
}
