import { computed } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { type JSX, useCallback, useEffect } from 'react';
import { Pressable, View } from 'react-native';
import { counterSignal, nameSignal } from './signals';

export function TestAutoFixUseMemo(): JSX.Element {
  // This useMemo should be auto-fixed when enableAutoFixForMemoAndCallback is true
  const expensiveValue = computed(() => {
    return counterSignal.value * 2 + nameSignal.value.length;
  }); // Missing counterSignal and nameSignal - should be auto-fixed

  return <View>{expensiveValue}</View>;
}

export function TestAutoFixUseCallback() {
  // This useCallback should be auto-fixed when enableAutoFixForMemoAndCallback is true
  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const onPress = useCallback(() => {
    console.info('Counter:', counterSignal.value);
    console.info('Name:', nameSignal.value);
  }, [counterSignal, nameSignal]); // Missing counterSignal and nameSignal - should be auto-fixed

  return <Pressable onPress={onPress}>Click me</Pressable>;
}

export function TestNoAutoFixUseEffect() {
  useSignals();

  useEffect(() => {
    console.info('Counter:', counterSignal.value);
    console.info('Name:', nameSignal.value);
    // This useEffect should NOT be auto-fixed (only suggested)
  }, []); // Missing counterSignal and nameSignal - should only suggest, not auto-fix

  return <View>Effect component</View>;
}
