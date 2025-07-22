import { signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
// biome-ignore lint/correctness/noUnusedImports: false positive
import React, { useMemo, type JSX } from 'react';
import { Text } from 'react-native';

type HexId = 'a' | 'b' | 'c';

type HexColor = 'white' | 'black' | 'grey';

type Hexagon = {
  id: HexId;
  color: HexColor;
  side: boolean;
  coordinate: [number, number, number];
};

const hexagonsSignal = signal<Record<HexId, Hexagon>>({
  a: {
    id: 'a',
    color: 'white',
    side: true,
    coordinate: [0, 0, 0] as const,
  },
  b: {
    id: 'b',
    color: 'black',
    side: false,
    coordinate: [1, 0, 0] as const,
  },
  c: {
    id: 'c',
    color: 'grey',
    side: true,
    coordinate: [0, 1, 0] as const,
  },
});

type Props = {
  id: HexId;
  isSelected: boolean;
  coordinate: [x: number, y: number, z: number];
};

function TestNestedProperties({ id, isSelected }: Props): JSX.Element | null {
  // Test case 1: Should warn that hexagonsSignal.value[id] is redundant
  // when more specific nested properties are accessed
  useSignals();

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const vector = useMemo(() => {
    return {
      x: hexagonsSignal.value[id].coordinate[0],
      y: hexagonsSignal.value[id].coordinate[1],
    };
  }, [
    id,
    hexagonsSignal.value[id], // This should be flagged as redundant
    hexagonsSignal.value[id].coordinate[0],
    hexagonsSignal.value[id].coordinate[1],
  ]);

  // Test case 2: Should warn about missing nested properties
  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const color = useMemo(() => {
    if (isSelected) {
      return '#4a90e2';
    }

    return hexagonsSignal.value[id].color;
  }, [
    isSelected,
    id,
    hexagonsSignal.value[id], // This should be replaced with hexagonsSignal.value[id].color
  ]);

  return <Text>{`${color} ${vector.x}`}</Text>;
}

export default TestNestedProperties;
