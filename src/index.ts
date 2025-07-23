import '@total-typescript/ts-reset';

import type { ESLint, Linter, Rule } from 'eslint';

import { exhaustiveDepsRule } from './exhaustive-deps.js';
import { requireUseSignalsRule } from './require-use-signals.js';
import { noMutationInRenderRule } from './no-mutation-in-render.js';
import { noSignalCreationInComponentRule } from './no-signal-creation-in-component.js';
// import { noSignalAssignmentInEffectRule } from './no-signal-assignment-in-effect.js';
// import { noNonSignalWithSignalSuffixRule } from './no-non-signal-with-signal-suffix.js';

import { preferComputedRule } from './prefer-computed.js';
import { preferForOverMapRule } from './prefer-for-over-map.js';
import { preferSignalInJsxRule } from './prefer-signal-in-jsx.js';
import { preferSignalEffectRule } from './prefer-signal-effect.js';
import { signalVariableNameRule } from './signal-variable-name.js';
import { preferShowOverTernaryRule } from './prefer-show-over-ternary.js';
import { warnOnUnnecessaryUntrackedRule } from './warn-on-unnecessary-untracked.js';

// import { preferSignalReadsRule } from './prefer-signal-reads.js';
// import { preferSignalMethodsRule } from './prefer-signal-methods.js';

// import { preferBatchUpdatesRule } from './prefer-batch-updates.js';
// import { preferBatchForMultiMutationsRule } from './prefer-batch-for-multi-mutations.js';

const rules = {
  'exhaustive-deps': exhaustiveDepsRule,
  'require-use-signals': requireUseSignalsRule,
  'no-mutation-in-render': noMutationInRenderRule,
  // 'no-signal-assignment-in-effect': noSignalAssignmentInEffectRule,
  // 'no-non-signal-with-signal-suffix': noNonSignalWithSignalSuffixRule,

  'prefer-signal-in-jsx': preferSignalInJsxRule,
  'prefer-show-over-ternary': preferShowOverTernaryRule,
  'prefer-for-over-map': preferForOverMapRule,
  'prefer-signal-effect': preferSignalEffectRule,
  'prefer-computed': preferComputedRule,
  // 'prefer-batch-updates': preferBatchUpdatesRule,
  // 'prefer-batch-for-multi-mutations': preferBatchForMultiMutationsRule,

  'signal-variable-name': signalVariableNameRule,
  'no-signal-creation-in-component': noSignalCreationInComponentRule,
  'warn-on-unnecessary-untracked': warnOnUnnecessaryUntrackedRule,
} as const satisfies Record<string, Rule.RuleModule>;

const configRules = {
  'react-hooks/rules-of-hooks': 'error',
  'react-hooks/exhaustive-deps': 'warn',
} satisfies Linter.RulesRecord;

const recommendedConfig = {
  name: 'react-hooks/recommended',
  plugins: {
    get 'react-hooks'(): ESLint.Plugin {
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
} satisfies ESLint.Plugin;

const configs = plugin.configs;
const meta = plugin.meta;
export { configs, meta, rules };

export default plugin;
