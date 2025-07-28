import * as THREE from 'three';

// Test case 1: Deprecated gammaFactor on material (should warn)
export function testDeprecatedGammaFactorOnMaterial() {
  const material = new THREE.MeshStandardMaterial();
  // @ts-expect-error - Testing deprecated property
  material.gammaFactor = 2.2; // This would trigger the rule
  return material;
}

// Test case 2: Deprecated gammaInput on renderer (should warn)
export function testDeprecatedGammaInput() {
  const renderer = new THREE.WebGLRenderer();
  // @ts-expect-error - Testing deprecated property
  renderer.gammaInput = true; // This would trigger the rule
  return renderer;
}

// Test case 3: Deprecated gammaOutput on renderer (should warn)
export function testDeprecatedGammaOutput() {
  const renderer = new THREE.WebGLRenderer();
  // @ts-expect-error - Testing deprecated property
  renderer.gammaOutput = true; // This would trigger the rule
  return renderer;
}

// Test case 4: Legacy gamma property (should warn)
export function testLegacyGammaProperty() {
  const material = new THREE.MeshStandardMaterial();
  // @ts-expect-error - Testing deprecated property
  material.gamma = 1.0; // This would trigger the rule
  return material;
}

// Test case 5: Modern color management (should pass)
export function testModernColorManagement() {
  // Configure color management (modern approach)
  THREE.ColorManagement.enabled = true;

  // Create a material with proper color space handling
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color('rgb(255, 0, 0)').convertSRGBToLinear(),
  });

  // Configure renderer for proper color output
  const renderer = new THREE.WebGLRenderer();
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  return { material, renderer };
}

// Test case 6: Gamma properties in a class (should warn)
export class MaterialWithDeprecatedGamma {
  createMaterial() {
    const material = new THREE.MeshStandardMaterial();
    // @ts-expect-error - Testing deprecated property
    material.gammaFactor = 2.2; // This would trigger the rule
    return material;
  }
}

// Test case 7: Gamma properties in a conditional (should warn)
export function testConditionalGamma(useGamma: boolean) {
  const material = new THREE.MeshStandardMaterial();

  if (useGamma) {
    // @ts-expect-error - Testing deprecated property
    material.gammaFactor = 2.2; // This would trigger the rule
  }

  return material;
}

// Test case 8: Gamma properties with object spread (should warn)
export function testGammaWithSpread() {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    // @ts-expect-error - Testing deprecated property
    gammaFactor: 2.2, // This would trigger the rule
    roughness: 0.5,
  });

  return material;
}

// Test case 9: Gamma properties with destructured import (should warn)
export function testGammaWithDestructuredImport() {
  const { MeshStandardMaterial } = THREE;
  const material = new MeshStandardMaterial();
  // @ts-expect-error - Testing deprecated property
  material.gammaFactor = 2.2; // This would trigger the rule
  return material;
}

// Test case 10: Gamma properties with aliased import (should warn)
export function testGammaWithAliasedImport() {
  const ThreeJS = THREE;
  const material = new ThreeJS.MeshStandardMaterial();
  // @ts-expect-error - Testing deprecated property
  material.gammaFactor = 2.2; // This would trigger the rule
  return material;
}

// Test case 11: Modern color space conversion (should pass)
export function testModernColorSpaceConversion() {
  // Enable color management
  THREE.ColorManagement.enabled = true;

  // Create a texture with proper color space handling
  const texture = new THREE.Texture();
  texture.colorSpace = THREE.SRGBColorSpace;

  // Create a material with proper color space handling
  const material = new THREE.MeshStandardMaterial({
    map: texture,
    color: new THREE.Color('red').convertSRGBToLinear(),
  });

  return material;
}

// Test case 12: Gamma properties in a try-catch block (should warn)
export function testGammaInTryCatch() {
  const material = new THREE.MeshStandardMaterial();

  try {
    // @ts-expect-error - Testing deprecated property
    material.gammaFactor = 2.2; // This would trigger the rule
  } catch (e) {
    console.error(e);
  }

  return material;
}

// Test case 13: Modern render target configuration (should pass)
export function testModernRenderTarget() {
  const renderer = new THREE.WebGLRenderer();

  // Configure renderer output color space
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  // Create a render target with proper color space
  const renderTarget = new THREE.WebGLRenderTarget(1024, 1024, {
    colorSpace: THREE.SRGBColorSpace,
  });

  return { renderer, renderTarget };
}

// Test case 14: Gamma properties with computed property names (should warn)
export function testGammaWithComputedProperty() {
  const propertyName = 'gammaFactor';
  const material = new THREE.MeshStandardMaterial();
  // @ts-expect-error - Testing deprecated property
  material[propertyName] = 2.2; // This would trigger the rule
  return material;
}

// Test case 15: Modern texture loading with color space (should pass)
export async function testModernTextureLoading() {
  // Modern approach to loading textures with proper color space
  const textureLoader = new THREE.TextureLoader();
  const texture = await new Promise<THREE.Texture>((resolve) => {
    textureLoader.load('texture.jpg', (texture) => {
      texture.colorSpace = THREE.SRGBColorSpace;
      resolve(texture);
    });
  });

  return new THREE.MeshStandardMaterial({ map: texture });
}
