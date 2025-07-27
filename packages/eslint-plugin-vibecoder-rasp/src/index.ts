import { stateColocation } from './state-colocation/state-coloration.js';
import { noPropDrilling } from './no-prop-drilling.js';
import { derivedStateMemo } from './derived-state-memo/derived-state-memo.js';
import { noStateMutation } from './no-state-mutation/no-state-mutation.js';
import { requireCleanup } from './require-cleanup/require-cleanup.js';
import { explicitProps } from './explicit-props/explicit-props.js';
import { noPropSpreading } from './no-prop-spreading/no-prop-spreading.js';
import { consistentPropOrdering } from './consistent-prop-ordering/consistent-prop-ordering.js';
import { noInlineFunctions } from './no-inline-functions/no-inline-functions.js';
import { requireKeys } from './require-keys/require-keys.js';
import { noAny } from './no-any/no-any.js';
import { explicitReturnTypes } from './explicit-return-types/explicit-return-types.js';
import { noTsIgnore } from './no-ts-ignore/no-ts-ignore.js';
import { mergeImports } from './merge-imports.js';
import { autoFixTypeImports } from './auto-fix-type-imports.js';

export const rules = {
  'state-colocation': stateColocation,
  'no-prop-drilling': noPropDrilling,
  'derived-state-memo': derivedStateMemo,
  'no-state-mutation': noStateMutation,
  'require-cleanup': requireCleanup,
  'explicit-props': explicitProps,
  'no-prop-spreading': noPropSpreading,
  'consistent-prop-ordering': consistentPropOrdering,
  'no-inline-functions': noInlineFunctions,
  'require-keys': requireKeys,
  'no-any': noAny,
  'explicit-return-types': explicitReturnTypes,
  'no-ts-ignore': noTsIgnore,
  'merge-imports': mergeImports,
  'auto-fix-type-imports': autoFixTypeImports,
} as const;

export const configs = {
  recommended: {
    plugins: ['vibecoder-rasp'],
    rules: Object.entries(rules).reduce(
      (acc, [ruleName, _rule]) => {
        acc[`vibecoder-rasp/${ruleName}`] = 'error';
        return acc;
      },
      {} as Record<string, unknown>
    ),
  },
} as const;

export default {
  rules,
  configs,
};
