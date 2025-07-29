import type { TSESLint } from '@typescript-eslint/utils';
import noDeprecatedGeometry from './no-deprecated-geometry';
import noDeprecatedTslBlendingFunctions from './no-deprecated-tsl-blending-functions';
import noDeprecatedGammaFactor from './no-deprecated-gamma-factor';
import noLegacyExamplesImports from './no-legacy-examples-imports';
import preferGpuAnimation from './prefer-gpu-animation';
import enforceClippingPlanes from './enforce-clipping-planes';
import limitShadowCasters from './limit-shadow-casters';

export const rules = {
  'no-deprecated-geometry': noDeprecatedGeometry,
  'no-deprecated-tsl-blending-functions': noDeprecatedTslBlendingFunctions,
  'no-deprecated-gamma-factor': noDeprecatedGammaFactor,
  'no-legacy-examples-imports': noLegacyExamplesImports,
  'prefer-gpu-animation': preferGpuAnimation,
  'enforce-clipping-planes': enforceClippingPlanes,
  'limit-shadow-casters': limitShadowCasters,
} as const;

export const configs = {
  recommended: {
    plugins: ['@ospm/threejs'],
    rules: Object.fromEntries(Object.keys(rules).map((rule) => [`@ospm/threejs/${rule}`, 'error'])),
  },
};

// Export for CommonJS compatibility
const plugin: TSESLint.Linter.Plugin = { rules, configs };
export default plugin;
