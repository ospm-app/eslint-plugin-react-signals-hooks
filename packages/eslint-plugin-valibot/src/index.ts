/* eslint-disable @typescript-eslint/no-namespace */
import type { Linter, ESLint } from 'eslint';

// Type definitions for ESLint 8 compatibility
type FlatConfig = ESLint.FlatConfig;
type LegacyConfig = Linter.Config;

declare module 'eslint' {
  // Add backward compatibility for ESLint 8
  namespace ESLint {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface FlatConfig {}
  }

  // Add backward compatibility for ESLint 8
  namespace Linter {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    interface Config {}
  }
}

// Import rules
import { zodToValibotRule } from './zod-to-valibot.js';
import { joiToValibotRule } from './joi-to-valibot.js';
import { arktypeToValibotRule } from './arktype-to-valibot.js';
import { typeToValibotRule } from './type-to-valibot.js';

const rules = {
  'zod-to-valibot': zodToValibotRule,
  'joi-to-valibot': joiToValibotRule,
  'arktype-to-valibot': arktypeToValibotRule,
  'type-to-valibot': typeToValibotRule,
} as const;

const configRules = {
  'zod-to-valibot': 'error',
  'joi-to-valibot': 'error',
  'arktype-to-valibot': 'error',
  'type-to-valibot': 'error',
} satisfies Linter.RulesRecord;

const recommendedConfig = {
  name: 'valibot/recommended',
  plugins: {
    get valibot() {
      // eslint-disable-next-line @typescript-eslint/no-use-before-define
      return plugin;
    },
  },
  rules: configRules,
};

const plugin = {
  meta: { name: 'eslint-plugin-valibot' },
  rules,
  configs: {
    'recommended-legacy': {
      plugins: ['valibot'],
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
