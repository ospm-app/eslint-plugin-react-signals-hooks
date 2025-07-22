// biome-ignore assist/source/organizeImports: @total-typescript/ts-reset
import '@total-typescript/ts-reset';

import type { ESLint, Linter, Rule } from 'eslint';

import { exhaustiveDepsRule } from './exhaustive-deps.js';
import { requireUseSignalsRule } from './require-use-signals.js';
import { noMutationInRenderRule } from './no-mutation-in-render.js';
import { preferSignalInJsxRule } from './prefer-signal-in-jsx.js';
import { preferShowOverTernaryRule } from './prefer-show-over-ternary.js';
import { preferForOverMapRule } from './prefer-for-over-map.js';
import { preferSignalEffectRule } from './prefer-signal-effect.js';
import { preferComputedRule } from './prefer-computed.js';
import { signalVariableNameRule } from './signal-variable-name.js';

// Define rules object with all rules
const rules = {
  'exhaustive-deps': exhaustiveDepsRule,
  'require-use-signals': requireUseSignalsRule,
  'no-mutation-in-render': noMutationInRenderRule,
  'prefer-signal-in-jsx': preferSignalInJsxRule,
  'prefer-show-over-ternary': preferShowOverTernaryRule,
  'prefer-for-over-map': preferForOverMapRule,
  'prefer-signal-effect': preferSignalEffectRule,
  'prefer-computed': preferComputedRule,
  'signal-variable-name': signalVariableNameRule,
} as const satisfies Record<string, Rule.RuleModule>;

const configRules = {
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'warn',
} satisfies Linter.RulesRecord;

const recommendedConfig = {
  name: 'react-hooks/recommended',
  plugins: {
    get 'react-hooks'(): ESLint.Plugin {
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
} satisfies ESLint.Plugin;

const configs = plugin.configs;
const meta = plugin.meta;
export { configs, meta, rules };

export default plugin;
