/* eslint-disable react-signals-hooks/prefer-signal-methods */
/** biome-ignore-all lint/correctness/useHookAtTopLevel: not relevant */
/** biome-ignore-all lint/correctness/useExhaustiveDependencies: not relevant */
/** biome-ignore-all assist/source/organizeImports: off */
import { computed, signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { useEffect, useMemo, type JSX } from 'react';

// Test case 1: Nested dependency objects
export function TestNestedObjects(): JSX.Element {
  const store = useSignals(1);

  try {
    const userSignal = signal({
      id: 1,
      name: 'John',
      address: {
        street: '123 Main St',
        city: 'Anytown',
        coordinates: {
          lat: 40.7128,
          lng: -74.006,
        },
      },
    });

    // Should warn about missing user.address dependency but no autofix in useEffect
    useEffect(() => {
      console.info(userSignal.value.address.city);
    }, []); // Missing userSignal.value.address.city

    // Should warn about missing user.address.coordinates.lat dependency but no autofix in useEffect
    useEffect(() => {
      console.info(userSignal.value.address.coordinates.lat);
    }, [userSignal.value.address]); // Missing userSignal.value.address.coordinates.lat

    return <div>{userSignal.value.name}</div>;
  } finally {
    store.f();
  }
}

// Test case 2: Special characters in dependency names
export function TestSpecialCharacters(): JSX.Element {
  const store = useSignals(1);

  try {
    const specialDataSignal = signal({
      'user-name': 'special-user',
      'user@email': 'test@example.com',
      'user.id': '12345',
      user_data: { value: 42 },
    });

    // Should handle special characters in property names
    useEffect(() => {
      console.info(specialDataSignal.value['user-name']);
    }, [specialDataSignal.value['user-name']]);

    // Should handle @ symbol in property names
    useEffect(() => {
      console.info(specialDataSignal.value['user@email']);
    }, [specialDataSignal.value['user@email']]);

    // Should handle dot in property names
    useEffect(() => {
      console.info(specialDataSignal.value['user.id']);
    }, [specialDataSignal.value['user.id']]);

    // Should handle underscore in property names
    useEffect(() => {
      console.info(specialDataSignal.value.user_data.value);
    }, [specialDataSignal.value.user_data]); // Should suggest adding .value

    return <div>Special Chars Test</div>;
  } finally {
    store.f();
  }
}

// Test case 3: Complex expressions in dependency arrays
export function TestComplexExpressions(): JSX.Element {
  const store = useSignals(1);

  try {
    const dataSignal = signal({
      items: [
        { id: 1, value: 'a' },
        { id: 2, value: 'b' },
        { id: 3, value: 'c' },
      ],
      filter: signal('a'),
      config: {
        maxItems: 10,
        enabled: true,
      },
    });

    // Complex expression with array methods
    const filteredItems = useMemo(() => {
      return dataSignal.value.items.filter((item: { id: number; value: string }): boolean => {
        return item.value === dataSignal.value.filter.value;
      });
    }, [dataSignal.value.items, dataSignal.value.filter.value]);

    // Complex expression with ternary
    const status = useMemo(() => {
      return dataSignal.value.config.enabled
        ? `Enabled with max ${dataSignal.value.config.maxItems} items`
        : 'Disabled';
    }, [dataSignal.value.config.enabled, dataSignal.value.config.maxItems]);

    // Complex expression with object spread
    const processedDataSignal = computed(() => {
      return {
        ...dataSignal.value,
        timestamp: Date.now(),
        processed: true,
      };
    });

    return (
      <div>
        <div>Filtered: {filteredItems.length} items</div>
        <div>Status: {status}</div>
        <div>Processed: {processedDataSignal.value.timestamp}</div>
        <div>Processed: {processedDataSignal.value.processed}</div>
        <div>Processed: {processedDataSignal.value.config.enabled}</div>
        <div>Processed: {processedDataSignal.value.config.maxItems}</div>
        <div>Processed: {processedDataSignal.value.items.length}</div>
      </div>
    );
  } finally {
    store.f();
  }
}

// Test case 4: Array indices in dependency paths
export function TestArrayIndices(): JSX.Element {
  const store = useSignals(1);

  try {
    const matrixSignal = signal([
      [1, 2, 3],
      [4, 5, 6],
      [7, 8, 9],
    ]);

    // Accessing array elements by index
    const sum = useMemo(() => {
      return (
        (matrixSignal.value[0]?.[0] ?? 0) +
        (matrixSignal.value[1]?.[1] ?? 0) +
        (matrixSignal.value[2]?.[2] ?? 0)
      ); // 1 + 5 + 9 = 15
    }, [matrixSignal.value[0]?.[0], matrixSignal.value[1]?.[1], matrixSignal.value[2]?.[2]]);

    // Dynamic index access
    const getRowSum = (rowIndex: number) => {
      return useMemo(() => {
        return matrixSignal.value[rowIndex]?.reduce((sum, num) => sum + num, 0);
      }, [rowIndex, matrixSignal.value[rowIndex]]); // Should handle dynamic indices
    };

    return (
      <div>
        <div>Sum of diagonal: {sum}</div>

        <div>Row 0 sum: {getRowSum(0)}</div>
      </div>
    );
  } finally {
    store.f();
  }
}

// Test case 5: Template literals in dependency paths
export function TestTemplateLiterals(): JSX.Element {
  const store = useSignals(1);

  try {
    const dataSignal = signal({
      user1: { name: 'Alice' },
      user2: { name: 'Bob' },
      user3: { name: 'Charlie' },
    });

    const userId = 'user1';

    // Using template literals in dependency paths
    useEffect(() => {
      console.info(dataSignal.value[`${userId}`].name);
    }, [dataSignal.value[`${userId}`].name]); // Should handle template literals

    return <div>Template Literal Test</div>;
  } finally {
    store.f();
  }
}
