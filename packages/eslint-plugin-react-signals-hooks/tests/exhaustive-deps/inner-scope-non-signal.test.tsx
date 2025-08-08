/** biome-ignore-all lint/correctness/useExhaustiveDependencies: these files validate the rule behavior */
/** biome-ignore-all assist/source/organizeImports: off */
import type { JSX } from 'react';
import { useCallback, useEffect, useMemo } from 'react';
import { Text, View } from 'react-native';

// Non-signal options list provided via props

type Props = { options: Array<{ value: string }>; index: number };

export function UseCallbackInnerScope({ options }: Props): JSX.Element {
  // Correct: inner-scope index used to read an element; only base 'options' should be required
  const onSelectionChange = useCallback((index: number): void => {
    const option = options[index];

    if (typeof option === 'undefined') {
      return;
    }
  }, []); // Missing dependency: options (should not require options[index])

  // Correct form:
  const onSelectionChange2 = useCallback(
    (index: number): void => {
      const option = options[index];
      if (typeof option === 'undefined') {
        return;
      }
    },
    [options]
  );

  void onSelectionChange;
  void onSelectionChange2;

  return <View />;
}

export function UseMemoInnerScope({ options }: Props): JSX.Element {
  // Correct: normalization to base dependency 'options'
  const values = useMemo(() => {
    return options.map((_, i) => options[i]?.value).filter(Boolean);
  }, [options]);

  return <Text>{values.join(',')}</Text>;
}

export function UseEffectInnerScope({ options }: Props): JSX.Element {
  // For effects, we should NOT force autofix when only inner-scope index is used.
  useEffect(() => {
    for (let i = 0; i < options.length; i++) {
      // read with inner-scope i
      void options[i]?.value;
    }
  }, []); // Should be valid, no forced dependency

  return <View />;
}
