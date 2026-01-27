/* eslint-disable @typescript-eslint/no-namespace */
import '@total-typescript/ts-reset';

import type { Linter, ESLint } from 'eslint';

// Type definitions for ESLint 8 compatibility
type FlatConfig = ESLint.FlatConfig;
type LegacyConfigType = Linter.ConfigBase;

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
    interface ConfigBase {
      // Add any legacy config specific types if needed
    }
  }
}

// Core rules
import { removeUseMemoRule } from './remove-use-memo.js';
import { removeUseCallbackRule } from './remove-use-callback.js';
import { removeMemoRule } from './remove-memo.js';

const rules = {
  'remove-use-memo': removeUseMemoRule,
  'remove-use-callback': removeUseCallbackRule,
  'remove-memo': removeMemoRule,
} as const;

const configRules = {
  'remove-use-memo': 'error',
  'remove-use-callback': 'error',
  'remove-memo': 'error',
} satisfies Linter.RulesRecord;

const recommendedConfig = {
  name: 'react-unhookify/recommended',
  plugins: {
    get 'react-unhookify'() {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      return plugin;
    },
  },
  rules: configRules,
};

const plugin = {
  meta: { name: 'eslint-plugin-react-unhookify' },
  rules,
  configs: {
    'recommended-legacy': {
      plugins: ['react-unhookify'],
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
export type { FlatConfig, Linter, ESLint };
export type LegacyConfig = LegacyConfigType;
