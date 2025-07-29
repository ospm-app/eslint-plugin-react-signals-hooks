/* eslint-disable @typescript-eslint/no-namespace */
import '@total-typescript/ts-reset';

import type { Linter, ESLint } from 'eslint';

// Type definitions for ESLint 8 compatibility
type FlatConfig = ESLint.FlatConfig;
type LegacyConfig = Linter.Config;

declare module 'eslint' {
  // Add backward compatibility for ESLint 8
  namespace ESLint {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface FlatConfig {
      // Add any flat config specific types if needed
    }
  }

  // Add backward compatibility for ESLint 8
  namespace Linter {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Config {
      // Add any legacy config specific types if needed
    }
  }
}

// Core rules
import { exhaustiveDepsRule } from './exhaustive-deps.js';
import { noMutationInRenderRule } from './no-mutation-in-render.js';
import { noNonSignalWithSignalSuffixRule } from './no-non-signal-with-signal-suffix.js';
import { noSignalAssignmentInEffectRule } from './no-signal-assignment-in-effect.js';
import { noSignalCreationInComponentRule } from './no-signal-creation-in-component.js';
// Performance optimization rules
import { preferBatchForMultiMutationsRule } from './prefer-batch-for-multi-mutations.js';
import { preferBatchUpdatesRule } from './prefer-batch-updates.js';
import { preferComputedRule } from './prefer-computed.js';
import { preferForOverMapRule } from './prefer-for-over-map.js';
import { preferShowOverTernaryRule } from './prefer-show-over-ternary.js';
import { preferSignalEffectRule } from './prefer-signal-effect.js';
import { preferSignalInJsxRule } from './prefer-signal-in-jsx.js';
import { preferSignalMethodsRule } from './prefer-signal-methods.js';
import { preferSignalReadsRule } from './prefer-signal-reads.js';
import { preferUseSignalOverUseStateRule } from './prefer-use-signal-over-use-state.js';
// Code style rules
import { requireUseSignalsRule } from './require-use-signals.js';
import { restrictSignalLocations } from './restrict-signal-locations.js';
import { signalVariableNameRule } from './signal-variable-name.js';
import { warnOnUnnecessaryUntrackedRule } from './warn-on-unnecessary-untracked.js';

const rules = {
  // Core rules
  'exhaustive-deps': exhaustiveDepsRule,
  'no-mutation-in-render': noMutationInRenderRule,
  'no-signal-assignment-in-effect': noSignalAssignmentInEffectRule,
  'no-non-signal-with-signal-suffix': noNonSignalWithSignalSuffixRule,
  'no-signal-creation-in-component': noSignalCreationInComponentRule,
  'require-use-signals': requireUseSignalsRule,
  'restrict-signal-locations': restrictSignalLocations,

  // Performance optimization rules
  'prefer-batch-updates': preferBatchUpdatesRule,
  'prefer-batch-for-multi-mutations': preferBatchForMultiMutationsRule,
  'prefer-computed': preferComputedRule,
  'prefer-for-over-map': preferForOverMapRule,
  'prefer-signal-effect': preferSignalEffectRule,
  'prefer-signal-in-jsx': preferSignalInJsxRule,
  'prefer-signal-methods': preferSignalMethodsRule,
  'prefer-signal-reads': preferSignalReadsRule,
  'prefer-use-signal-over-use-state': preferUseSignalOverUseStateRule,

  // Code style rules
  'prefer-show-over-ternary': preferShowOverTernaryRule,
  'signal-variable-name': signalVariableNameRule,
  'warn-on-unnecessary-untracked': warnOnUnnecessaryUntrackedRule,
} as const;

const configRules = {
  'react-hooks/exhaustive-deps': 'off',

  'exhaustive-deps': 'error',
  'no-mutation-in-render': 'error',
  'no-signal-assignment-in-effect': 'error',
  'no-non-signal-with-signal-suffix': 'error',
  'no-signal-creation-in-component': 'error',
  'require-use-signals': 'error',
  'restrict-signal-locations': 'error',

  // Performance optimization rules
  'prefer-batch-updates': 'error',
  'prefer-batch-for-multi-mutations': 'error',
  'prefer-computed': 'error',
  'prefer-for-over-map': 'error',
  'prefer-signal-effect': 'error',
  'prefer-signal-in-jsx': 'error',
  'prefer-signal-methods': 'error',
  'prefer-signal-reads': 'error',
  'prefer-use-signal-over-use-state': 'error',

  // Code style rules
  'prefer-show-over-ternary': 'error',
  'signal-variable-name': 'error',
  'warn-on-unnecessary-untracked': 'error',
} satisfies Linter.RulesRecord;

const recommendedConfig = {
  name: 'react-signals-hooks/recommended',
  plugins: {
    get 'react-signals-hooks'() {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      return plugin;
    },
  },
  rules: configRules,
};

const plugin = {
  meta: { name: 'eslint-plugin-react-signals-hooks' },
  rules,
  configs: {
    'recommended-legacy': {
      plugins: ['react-signals-hooks'],
      rules: configRules,
    },

    recommended: recommendedConfig,
    'recommended-latest': recommendedConfig,
  },
};

// Export for both ESM and CommonJS
const configs = plugin.configs;
const meta = plugin.meta;

// Export for ESLint 9+ (flat config)
export { configs, meta, rules };

// Export for ESLint 8 (legacy config)
export const configsLegacy = configs;
export const metaLegacy = meta;
export const rulesLegacy = rules;

// Default export for backward compatibility
export default plugin;

// TypeScript type exports
export type { FlatConfig, LegacyConfig, Linter, ESLint };
