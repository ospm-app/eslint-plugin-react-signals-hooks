import type { Linter, ESLint } from 'eslint';

// Type definitions for ESLint 8 compatibility
type FlatConfig = ESLint.FlatConfig;
type LegacyConfig = Linter.Config;

declare module 'eslint' {
  namespace ESLint {
    interface FlatConfig {}
  }

  namespace Linter {
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

export {
  zodToValibotRule,
  joiToValibotRule,
  arktypeToValibotRule,
  typeToValibotRule,
  rules as default,
};

export type Rules = keyof typeof rules;

export const configs: Record<string, FlatConfig | LegacyConfig> = {
  recommended: {
    plugins: ['@ospm/valibot'],
    rules: Object.fromEntries(
      Object.keys(rules).map((rule) => [`@ospm/valibot/${rule}`, 'error'])
    ) as Record<`@ospm/valibot/${Rules}`, 'error'>,
  },
};
