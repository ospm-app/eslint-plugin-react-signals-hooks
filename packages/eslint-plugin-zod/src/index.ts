import type { ESLint } from 'eslint';

// Type definitions for ESLint 8 compatibility
type FlatConfig = ESLint.FlatConfig;
type LegacyConfig = ESLint.LinterConfig;

declare module 'eslint' {
  namespace ESLint {
    interface FlatConfig {}
  }

  namespace Linter {
    interface Config {}
  }
}

// Import rules
import { valibotToZodRule } from './valibot-to-zod.js';
import { jaiToZodRule } from './joi-to-zod.js';
import { arktypeToZodRule } from './arktype-to-zod.js';
import { typeToZodRule } from './type-to-zod.js';

const plugin: ESLint.Plugin = {
  rules: {
    'valibot-to-zod': valibotToZodRule,
    'joi-to-zod': jaiToZodRule,
    'arktype-to-zod': arktypeToZodRule,
    'type-to-zod': typeToZodRule,
  },
  configs: {
    recommended: {
      plugins: ['@ospm/zod'],
      rules: {
        '@ospm/zod/valibot-to-zod': 'error',
        '@ospm/zod/joi-to-zod': 'error',
        '@ospm/zod/arktype-to-zod': 'error',
        '@ospm/zod/type-to-zod': 'error',
      },
    },
  },
};

export default plugin;
