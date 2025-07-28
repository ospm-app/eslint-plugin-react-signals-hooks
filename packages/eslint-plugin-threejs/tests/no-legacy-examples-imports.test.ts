// oxlint-disable no-unused-vars
// Test case 1: Direct import from three/examples (should warn)
/** biome-ignore-all lint/correctness/noUnusedPrivateClassMembers: not relevant */
/** biome-ignore-all lint/suspicious/noRedeclare: not relevant */
/** biome-ignore-all lint/correctness/noUnusedVariables: not relevant */
/** biome-ignore-all lint/correctness/noUnusedImports: not relevant */

// This import would trigger the rule
// @ts-expect-error
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Test case 2: Aliased import (should warn)
// This import would trigger the rule
// @ts-expect-error
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer';

// Test case 3: Dynamic import (should warn)
// This dynamic import would trigger the rule
// @ts-expect-error
export const module = await import('three/examples/jsm/loaders/GLTFLoader');

// Test case 4: Require statement (should warn)
// This require would trigger the rule
const { DRACOLoader } = require('three/examples/jsm/loaders/DRACOLoader');

// Test case 5: Import with alias (should warn)
// This import would trigger the rule
// @ts-expect-error
import { OrbitControls as Controls } from 'three/examples/jsm/controls/OrbitControls';

// Test case 6: Multiple imports (should warn)
// These imports would trigger the rule
// @ts-expect-error
import { OrbitControls as OrbitControls6 } from 'three/examples/jsm/controls/OrbitControls';
// @ts-expect-error
import { EffectComposer as EffectComposer1 } from 'three/examples/jsm/postprocessing/EffectComposer';

// Test case 7: Import in a class (should warn)
export class ExampleImporter {
  private controls = null; // Would be set from three/examples import

  async initialize() {
    // This import would trigger the rule
    const { OrbitControls: OrbitControls5 } = await import(
      // @ts-expect-error
      'three/examples/jsm/controls/OrbitControls'
    );
    this.controls = OrbitControls5;
  }
}

// Test case 8: Conditional import (should warn)
export async function testConditionalImport(useLegacy: boolean) {
  if (useLegacy) {
    // This import would trigger the rule
    // @ts-expect-error
    const module = await import('three/examples/jsm/controls/OrbitControls');
    return 'Conditionally imported legacy module';
  }

  return 'Using modern alternative';
}

// Test case 9: Import with side effects (should warn)
// This import would trigger the rule
import 'three/examples/js/WebGL';

// Test case 10: Import with deep path (should warn)
// This import would trigger the rule
// @ts-expect-error
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader';

// Test case 11: Import with query parameters (should warn)
// This import would trigger the rule
// @ts-expect-error
import { OrbitControls as OrbitControls4 } from 'three/examples/jsm/controls/OrbitControls.js?foo=bar';

// Test case 12: Import with custom extension (should warn)
// This import would trigger the rule
// @ts-expect-error
import { OrbitControls as OrbitControls3 } from 'three/examples/jsm/controls/OrbitControls.mjs';

// Test case 13: Import with dynamic path (should warn)
// This dynamic import would trigger the rule
export async function testDynamicPathImport(modulePath: string) {
  const module = await import(`three/examples/jsm/${modulePath}`);
}

// Test case 14: Multiple imports in one statement (should warn)
// These imports would trigger the rule
import {
  OrbitControls as OrbitControls2,
  MapControls,
  // @ts-expect-error
} from 'three/examples/jsm/controls/OrbitControls';

// Test case 15: Import with type-only import (should warn)
// This import would trigger the rule
// @ts-expect-error
import type { OrbitControls as OrbitControls1 } from 'three/examples/jsm/controls/OrbitControls';
