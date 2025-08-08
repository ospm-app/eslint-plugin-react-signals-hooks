import { signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { type JSX, useCallback, useMemo } from 'react';
import { Pressable, Text, View } from 'react-native';

type HexId = 'a' | 'b' | 'c';

type HexColor = 'white' | 'black' | 'grey';

type SecondRowDirection =
  | 'topRight2'
  | 'right2'
  | 'bottomRight2'
  | 'bottomLeft2'
  | 'left2'
  | 'topLeft2';

type Neighbor = {
  id: HexId | '';
  position: [number, number, number] | null;
};

type NeighborN = {
  id: Array<HexId>;
  position: Array<[number, number, number]>;
};

type FirstRowDirection = 'topRight' | 'right' | 'bottomRight' | 'bottomLeft' | 'left' | 'topLeft';

type DiagonalDirection = 'top' | 'rightTop' | 'rightBottom' | 'bottom' | 'leftBottom' | 'leftTop';

type KnightDirection =
  | 'topRight2TopLeft'
  | 'topRight2Right'
  | 'right2TopRight'
  | 'right2BottomRight'
  | 'bottomRight2Right'
  | 'bottomRight2BottomLeft'
  | 'bottomLeft2BottomRight'
  | 'bottomLeft2Left'
  | 'left2BottomLeft'
  | 'left2TopLeft'
  | 'topLeft2Left'
  | 'topLeft2TopRight';

type NeighborDirection = FirstRowDirection | DiagonalDirection | KnightDirection;

type NDiagonalDirection =
  | 'topRightN'
  | 'rightN'
  | 'bottomRightN'
  | 'bottomLeftN'
  | 'leftN'
  | 'topLeftN'
  | 'topN'
  | 'rightTopN'
  | 'rightBottomN'
  | 'bottomN'
  | 'leftBottomN'
  | 'leftTopN';

type NRowDirection =
  | 'topRightN'
  | 'rightN'
  | 'bottomRightN'
  | 'bottomLeftN'
  | 'leftN'
  | 'topLeftN'
  | 'topN'
  | 'rightTopN'
  | 'rightBottomN'
  | 'bottomN'
  | 'leftBottomN'
  | 'leftTopN';

type NeighborDirectionN = NDiagonalDirection | NRowDirection;

type Neighbors1 = Record<NeighborDirection, Neighbor>;
type Neighbors2 = Record<SecondRowDirection, NeighborN>;
type NeighborsN = Record<NeighborDirectionN, NeighborN>;
export type Neighbors = Neighbors1 & Neighbors2 & NeighborsN;

type Hexagon = {
  id: HexId;
  color: HexColor;
  side: boolean;
  coordinate: [number, number, number];
  neighbors: Neighbors;
};

export type PlayerColor = 'w' | 'b' | 'g';

const currentPlayerSignal = signal<PlayerColor>('w');

const hexagonsSignal = signal<Record<HexId, Hexagon>>({
  a: {
    id: 'a',
    color: 'white',
    side: true,
    coordinate: [0, 0, 0] as const,
    neighbors: {
      topRight: {
        id: 'a',
        position: [1, 0, 0] as const,
      },
      right: {
        id: 'b',
        position: [0, 1, 0] as const,
      },
      bottomRight: {
        id: 'c',
        position: [1, 1, 0] as const,
      },
      bottomLeft: {
        id: 'a',
        position: [0, 0, 1] as const,
      },
      left: {
        id: 'b',
        position: [1, 0, 1] as const,
      },
      topLeft: {
        id: 'c',
        position: [0, 1, 1] as const,
      },
      top: {
        id: 'a',
        position: [0, 0, 0] as const,
      },
      rightTop: {
        id: 'b',
        position: [0, 0, 0] as const,
      },
      rightBottom: {
        id: 'c',
        position: [0, 0, 0] as const,
      },
      bottom: {
        id: 'a',
        position: [0, 0, 0] as const,
      },
      leftBottom: {
        id: 'b',
        position: [0, 0, 0] as const,
      },
      leftTop: {
        id: 'c',
        position: [0, 0, 0] as const,
      },
      topRight2TopLeft: {
        id: 'a',
        position: [0, 0, 0] as const,
      },
      topRight2Right: {
        id: 'b',
        position: [0, 0, 0] as const,
      },
      right2TopRight: {
        id: 'c',
        position: [0, 0, 0] as const,
      },
      right2BottomRight: {
        id: 'a',
        position: [0, 0, 0] as const,
      },
      bottomRight2Right: {
        id: 'b',
        position: [0, 0, 0] as const,
      },
      bottomRight2BottomLeft: {
        id: 'c',
        position: [0, 0, 0] as const,
      },
      bottomLeft2BottomRight: {
        id: 'a',
        position: [0, 0, 0] as const,
      },
      bottomLeft2Left: {
        id: 'b',
        position: [0, 0, 0] as const,
      },
      left2BottomLeft: {
        id: 'c',
        position: [0, 0, 0] as const,
      },
      left2TopLeft: {
        id: 'a',
        position: [0, 0, 0] as const,
      },
      topLeft2Left: {
        id: 'b',
        position: [0, 0, 0] as const,
      },
      topLeft2TopRight: {
        id: 'c',
        position: [0, 0, 0] as const,
      },
      topRight2: {
        id: ['a'],
        position: [[0, 0, 0]] as const,
      },
      right2: {
        id: ['b'],
        position: [[0, 0, 0]] as const,
      },
      bottomRight2: {
        id: ['c'],
        position: [[0, 0, 0]] as const,
      },
      bottomLeft2: {
        id: ['a'],
        position: [[0, 0, 0]] as const,
      },
      left2: {
        id: ['b'],
        position: [[0, 0, 0]] as const,
      },
      topLeft2: {
        id: ['c'],
        position: [[0, 0, 0]] as const,
      },
      topRightN: {
        id: ['a'],
        position: [[0, 0, 0]] as const,
      },
      rightN: {
        id: ['b'],
        position: [[0, 0, 0]] as const,
      },
      bottomRightN: {
        id: ['c'],
        position: [[0, 0, 0]] as const,
      },
      bottomLeftN: {
        id: ['a'],
        position: [[0, 0, 0]] as const,
      },
      leftN: {
        id: ['b'],
        position: [[0, 0, 0]] as const,
      },
      topLeftN: {
        id: ['c'],
        position: [[0, 0, 0]] as const,
      },
      topN: {
        id: ['a'],
        position: [[0, 0, 0]] as const,
      },
      rightTopN: {
        id: ['b'],
        position: [[0, 0, 0]] as const,
      },
      rightBottomN: {
        id: ['c'],
        position: [[0, 0, 0]] as const,
      },
      bottomN: {
        id: ['a'],
        position: [[0, 0, 0]] as const,
      },
      leftBottomN: {
        id: ['b'],
        position: [[0, 0, 0]] as const,
      },
      leftTopN: {
        id: ['c'],
        position: [[0, 0, 0]] as const,
      },
    },
  },
  b: {
    id: 'b',
    color: 'black',
    side: false,
    coordinate: [1, 0, 0] as const,
    neighbors: {
      topRight: {
        id: 'a',
        position: [1, 0, 0] as const,
      },
      right: {
        id: 'b',
        position: [0, 1, 0] as const,
      },
      bottomRight: {
        id: 'c',
        position: [1, 1, 0] as const,
      },
      bottomLeft: {
        id: 'a',
        position: [0, 0, 1] as const,
      },
      left: {
        id: 'b',
        position: [1, 0, 1] as const,
      },
      topLeft: {
        id: 'c',
        position: [0, 1, 1] as const,
      },
      top: {
        id: 'a',
        position: [0, 0, 0] as const,
      },
      rightTop: {
        id: 'b',
        position: [0, 0, 0] as const,
      },
      rightBottom: {
        id: 'c',
        position: [0, 0, 0] as const,
      },
      bottom: {
        id: 'a',
        position: [0, 0, 0] as const,
      },
      leftBottom: {
        id: 'b',
        position: [0, 0, 0] as const,
      },
      leftTop: {
        id: 'c',
        position: [0, 0, 0] as const,
      },
      topRight2TopLeft: {
        id: 'a',
        position: [0, 0, 0] as const,
      },
      topRight2Right: {
        id: 'b',
        position: [0, 0, 0] as const,
      },
      right2TopRight: {
        id: 'c',
        position: [0, 0, 0] as const,
      },
      right2BottomRight: {
        id: 'a',
        position: [0, 0, 0] as const,
      },
      bottomRight2Right: {
        id: 'b',
        position: [0, 0, 0] as const,
      },
      bottomRight2BottomLeft: {
        id: 'c',
        position: [0, 0, 0] as const,
      },
      bottomLeft2BottomRight: {
        id: 'a',
        position: [0, 0, 0] as const,
      },
      bottomLeft2Left: {
        id: 'b',
        position: [0, 0, 0] as const,
      },
      left2BottomLeft: {
        id: 'c',
        position: [0, 0, 0] as const,
      },
      left2TopLeft: {
        id: 'a',
        position: [0, 0, 0] as const,
      },
      topLeft2Left: {
        id: 'b',
        position: [0, 0, 0] as const,
      },
      topLeft2TopRight: {
        id: 'c',
        position: [0, 0, 0] as const,
      },
      topRight2: {
        id: ['a'],
        position: [[0, 0, 0]] as const,
      },
      right2: {
        id: ['b'],
        position: [[0, 0, 0]] as const,
      },
      bottomRight2: {
        id: ['c'],
        position: [[0, 0, 0]] as const,
      },
      bottomLeft2: {
        id: ['a'],
        position: [[0, 0, 0]] as const,
      },
      left2: {
        id: ['b'],
        position: [[0, 0, 0]] as const,
      },
      topLeft2: {
        id: ['c'],
        position: [[0, 0, 0]] as const,
      },
      topRightN: {
        id: ['a'],
        position: [[0, 0, 0]] as const,
      },
      rightN: {
        id: ['b'],
        position: [[0, 0, 0]] as const,
      },
      bottomRightN: {
        id: ['c'],
        position: [[0, 0, 0]] as const,
      },
      bottomLeftN: {
        id: ['a'],
        position: [[0, 0, 0]] as const,
      },
      leftN: {
        id: ['b'],
        position: [[0, 0, 0]] as const,
      },
      topLeftN: {
        id: ['c'],
        position: [[0, 0, 0]] as const,
      },
      topN: {
        id: ['a'],
        position: [[0, 0, 0]] as const,
      },
      rightTopN: {
        id: ['b'],
        position: [[0, 0, 0]] as const,
      },
      rightBottomN: {
        id: ['c'],
        position: [[0, 0, 0]] as const,
      },
      bottomN: {
        id: ['a'],
        position: [[0, 0, 0]] as const,
      },
      leftBottomN: {
        id: ['b'],
        position: [[0, 0, 0]] as const,
      },
      leftTopN: {
        id: ['c'],
        position: [[0, 0, 0]] as const,
      },
    },
  },
  c: {
    id: 'c',
    color: 'grey',
    side: true,
    coordinate: [0, 1, 0] as const,
    neighbors: {
      topRight: {
        id: 'a',
        position: [1, 0, 0] as const,
      },
      right: {
        id: 'b',
        position: [0, 1, 0] as const,
      },
      bottomRight: {
        id: 'c',
        position: [1, 1, 0] as const,
      },
      bottomLeft: {
        id: 'a',
        position: [0, 0, 1] as const,
      },
      left: {
        id: 'b',
        position: [1, 0, 1] as const,
      },
      topLeft: {
        id: 'c',
        position: [0, 1, 1] as const,
      },
      top: {
        id: 'a',
        position: [0, 0, 0] as const,
      },
      rightTop: {
        id: 'b',
        position: [0, 0, 0] as const,
      },
      rightBottom: {
        id: 'c',
        position: [0, 0, 0] as const,
      },
      bottom: {
        id: 'a',
        position: [0, 0, 0] as const,
      },
      leftBottom: {
        id: 'b',
        position: [0, 0, 0] as const,
      },
      leftTop: {
        id: 'c',
        position: [0, 0, 0] as const,
      },
      topRight2TopLeft: {
        id: 'a',
        position: [0, 0, 0] as const,
      },
      topRight2Right: {
        id: 'b',
        position: [0, 0, 0] as const,
      },
      right2TopRight: {
        id: 'c',
        position: [0, 0, 0] as const,
      },
      right2BottomRight: {
        id: 'a',
        position: [0, 0, 0] as const,
      },
      bottomRight2Right: {
        id: 'b',
        position: [0, 0, 0] as const,
      },
      bottomRight2BottomLeft: {
        id: 'c',
        position: [0, 0, 0] as const,
      },
      bottomLeft2BottomRight: {
        id: 'a',
        position: [0, 0, 0] as const,
      },
      bottomLeft2Left: {
        id: 'b',
        position: [0, 0, 0] as const,
      },
      left2BottomLeft: {
        id: 'c',
        position: [0, 0, 0] as const,
      },
      left2TopLeft: {
        id: 'a',
        position: [0, 0, 0] as const,
      },
      topLeft2Left: {
        id: 'b',
        position: [0, 0, 0] as const,
      },
      topLeft2TopRight: {
        id: 'c',
        position: [0, 0, 0] as const,
      },
      topRight2: {
        id: ['a'],
        position: [[0, 0, 0]] as const,
      },
      right2: {
        id: ['b'],
        position: [[0, 0, 0]] as const,
      },
      bottomRight2: {
        id: ['c'],
        position: [[0, 0, 0]] as const,
      },
      bottomLeft2: {
        id: ['a'],
        position: [[0, 0, 0]] as const,
      },
      left2: {
        id: ['b'],
        position: [[0, 0, 0]] as const,
      },
      topLeft2: {
        id: ['c'],
        position: [[0, 0, 0]] as const,
      },
      topRightN: {
        id: ['a'],
        position: [[0, 0, 0]] as const,
      },
      rightN: {
        id: ['b'],
        position: [[0, 0, 0]] as const,
      },
      bottomRightN: {
        id: ['c'],
        position: [[0, 0, 0]] as const,
      },
      bottomLeftN: {
        id: ['a'],
        position: [[0, 0, 0]] as const,
      },
      leftN: {
        id: ['b'],
        position: [[0, 0, 0]] as const,
      },
      topLeftN: {
        id: ['c'],
        position: [[0, 0, 0]] as const,
      },
      topN: {
        id: ['a'],
        position: [[0, 0, 0]] as const,
      },
      rightTopN: {
        id: ['b'],
        position: [[0, 0, 0]] as const,
      },
      rightBottomN: {
        id: ['c'],
        position: [[0, 0, 0]] as const,
      },
      bottomN: {
        id: ['a'],
        position: [[0, 0, 0]] as const,
      },
      leftBottomN: {
        id: ['b'],
        position: [[0, 0, 0]] as const,
      },
      leftTopN: {
        id: ['c'],
        position: [[0, 0, 0]] as const,
      },
    },
  },
});

type Props = {
  id: HexId;
};

export function TestDeepPropertyChains({ id }: Props): JSX.Element {
  // Test case 1: Deep property chain access
  // Should detect hexagonsSignal.value[id].neighbors.top.id as missing dependency
  useSignals();

  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const neighborTopId = useMemo(() => {
    return hexagonsSignal.value[id].neighbors.top.id;
  }, [id, hexagonsSignal.value[id].neighbors.top.id]);

  // Test case 2: Multiple deep property chain accesses
  // Should detect all the specific nested property dependencies
  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const neighborData = useCallback(() => {
    const topId = hexagonsSignal.value[id].neighbors.top.id;
    const rightTopId = hexagonsSignal.value[id].neighbors.rightTop.id;
    const bottomId = hexagonsSignal.value[id].neighbors.bottom.id;

    return {
      topId,
      rightTopId,
      bottomId,
    };
  }, [
    id,
    currentPlayerSignal.value,
    hexagonsSignal.value[id].neighbors.rightTop.id,
    hexagonsSignal.value[id].neighbors.bottom.id,
    hexagonsSignal.value[id].neighbors.top.id,
  ]);

  // Test case 3: Should NOT suggest hexagonsSignal.value[*]
  // when deep property chains are accessed
  // biome-ignore lint/correctness/useExhaustiveDependencies: false positive
  const complexNeighborCheck = useMemo(() => {
    if (!hexagonsSignal.value[id]) {
      return false;
    }

    const hasTopNeighbor = hexagonsSignal.value[id].neighbors.top.id !== null;
    const hasRightNeighbor = hexagonsSignal.value[id].neighbors.rightTop.id !== null;

    return hasTopNeighbor && hasRightNeighbor;
  }, [
    id,
    hexagonsSignal.value[id].neighbors.rightTop.id,
    hexagonsSignal.value[id].neighbors.top.id,
    hexagonsSignal.value[id],
  ]);

  return (
    <View>
      <Pressable onPointerDown={neighborData}>
        <Text>{complexNeighborCheck}</Text>
      </Pressable>

      <Pressable>
        <Text>{complexNeighborCheck}</Text>
      </Pressable>

      <Text>{neighborTopId}</Text>
    </View>
  );
}

type TestDeepDependenciesProps = {
  insets: { bottom: number };
};

// Test case for insets.bottom scenario
export function TestDeepDependencies({ insets }: TestDeepDependenciesProps): JSX.Element {
  // This should NOT trigger a warning about missing 'insets' dependency
  const boxStyle = useMemo(() => {
    return { bottom: insets.bottom + 20 };
  }, [insets.bottom]);

  // This should trigger a warning about missing 'insets.bottom' dependency
  const boxStyle2 = useMemo(() => {
    return { bottom: insets.bottom + 20 };
  }, [insets]);

  // This should trigger a warning about missing 'insets.bottom' dependency
  // biome-ignore lint/correctness/useExhaustiveDependencies: Testing the rule
  const boxStyle3 = useMemo(() => {
    return { bottom: insets.bottom + 20 };
  }, []);

  return (
    <View>
      <View style={boxStyle} />
      <View style={boxStyle2} />
      <View style={boxStyle3} />
    </View>
  );
}

type Theme = {
  colors: {
    button: {
      bg: string;
    };
  };
};

type TestDeeperDependenciesProps = {
  theme: Theme;
};

// Test cases for deeper non-signal property chains: theme.colors.button.bg
export function TestDeeperNonSignalDependencies({
  theme,
}: TestDeeperDependenciesProps): JSX.Element {
  // Correct: should NOT warn when listing the exact deep dependency
  const btnStyle = useMemo(() => {
    return { backgroundColor: theme.colors.button.bg };
  }, [theme.colors.button.bg]);

  // Incorrect: should warn missing 'theme.colors.button.bg' and unnecessary 'theme'
  const btnStyle2 = useMemo(() => {
    return { backgroundColor: theme.colors.button.bg };
  }, [theme]);

  // Incorrect: should warn missing 'theme.colors.button.bg'
  // biome-ignore lint/correctness/useExhaustiveDependencies: Testing the rule
  const btnStyle3 = useMemo(() => {
    return { backgroundColor: theme.colors.button.bg };
  }, []);

  return (
    <View>
      <View style={btnStyle} />
      <View style={btnStyle2} />
      <View style={btnStyle3} />
    </View>
  );
}

type TestPropertyAccessNonSignalProps = {
  theme: Theme;
  prop: 'bg';
};

// Property access via bracket notation on non-signal object
export function TestPropertyAccessNonSignal({
  theme,
  prop,
}: TestPropertyAccessNonSignalProps): JSX.Element {
  // Correct: exact deep dependency via bracket notation
  const btnStyle = useMemo(() => {
    return { backgroundColor: theme['colors']['button'][prop] };
  }, [prop, theme['colors']['button'][prop]]);

  // Incorrect: should warn missing 'theme.colors.button.bg' and unnecessary 'theme'
  const btnStyle2 = useMemo(() => {
    return { backgroundColor: theme['colors']['button'][prop] };
  }, [prop, theme]);

  // Incorrect: should warn missing 'theme.colors.button.bg'
  // biome-ignore lint/correctness/useExhaustiveDependencies: Testing the rule
  const btnStyle3 = useMemo(() => {
    return { backgroundColor: theme['colors']['button'][prop] };
  }, [prop]);

  return (
    <View>
      <View style={btnStyle} />
      <View style={btnStyle2} />
      <View style={btnStyle3} />
    </View>
  );
}

type ListProps = {
  data: { items: Array<{ value: number }>; index: number };
};

// Array index access on non-signal arrays
export function TestArrayIndexNonSignal({ data }: ListProps): JSX.Element {
  useSignals();

  // Correct: exact deep dependency including computed index
  const selected = useMemo(() => {
    return data.items[data.index]?.value;
  }, [data.index, data.items[data.index]?.value]);

  // Incorrect: should warn missing 'data.items[data.index].value' and unnecessary 'data'
  const selected2 = useMemo(() => {
    return data.items[data.index]?.value;
  }, [data]);

  // Incorrect: should warn missing 'data.items[data.index].value'
  // biome-ignore lint/correctness/useExhaustiveDependencies: Testing the rule
  const selected3 = useMemo(() => {
    return data.items[data.index]?.value;
  }, []);

  return (
    <View>
      <Text>{selected}</Text>
      <Text>{selected2}</Text>
      <Text>{selected3}</Text>
    </View>
  );
}

type TupleProps = {
  data: {
    items: [{ value: 0 }, { value: 1 }, { value: 2 }, { value: 3 }];
  };
};

// Array index access on non-signal arrays
export function TestTupleIndexNonSignal({ data }: TupleProps): JSX.Element {
  useSignals();

  // Correct: exact deep dependency including computed index
  const selected = useMemo(() => {
    return data.items[3].value;
  }, [data.items[3].value]);

  // Incorrect: should warn missing 'data.items[data.index].value' and unnecessary 'data'
  const selected2 = useMemo(() => {
    return data.items[2].value;
  }, [data]);

  // Incorrect: should warn missing 'data.items[data.index].value'
  // biome-ignore lint/correctness/useExhaustiveDependencies: Testing the rule
  const selected3 = useMemo(() => {
    return data.items[1].value;
  }, []);

  return (
    <View>
      <Text>{selected}</Text>
      <Text>{selected2}</Text>
      <Text>{selected3}</Text>
    </View>
  );
}
