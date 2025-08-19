/* eslint-disable react-signals-hooks/prefer-signal-effect */
/* eslint-disable react-signals-hooks/prefer-signal-methods */
/** biome-ignore-all lint/correctness/useExhaustiveDependencies: not relevant */
/** biome-ignore-all lint/correctness/useHookAtTopLevel: off */
/** biome-ignore-all assist/source/organizeImports: off */
import { signal } from '@preact/signals-react';
import { useCallback, useEffect, useMemo, type JSX } from 'react';
import { useSignals } from '@preact/signals-react/runtime';

// Test signals
const piecePosMapSignal = signal<Record<string, [number, number]>>({});
const hexagonsSignal = signal<Array<{ id: string }>>([]);
// const piecesSignal = signal<Array<{ id: string }>>([]);

// External ID (from outside the hook scope)
const externalId = 'piece1';

/**
 * Test Component for Inner Scope Computed Properties
 *
 * When a computed property uses an index/key from the inner hook scope (like a loop variable),
 * only the base signal (e.g., hexagonsSignal.value) should be required in the dependency array.
 */
function InnerScopeTest(): JSX.Element | null {
  // Test 1: Inner scope index in for loop
  useEffect(() => {
    // Using hexagonsSignal.value[i] where i is from inner scope
    for (let i = 0; i < 10; i++) {
      console.info(hexagonsSignal.value[i]);
    }
    // Should only require hexagonsSignal.value in deps
  }, [hexagonsSignal.value]); // This is correct - only base signal needed

  // Test 2: Inner scope variable in map function
  useMemo(() => {
    return hexagonsSignal.value.map((_hex, index) => {
      // Using hexagonsSignal.value[index] where index is from inner scope
      return hexagonsSignal.value[index]?.id;
    });
    // Should only require hexagonsSignal.value in deps
  }, []); // Missing dependency: hexagonsSignal.value

  return null;
}

/**
 * Test Component for External Scope Computed Properties
 *
 * When a computed property uses an index/key from outside the hook scope (like a prop or global),
 * both the base signal (e.g., piecePosMapSignal.value) AND the computed property
 * (e.g., piecePosMapSignal.value[externalId]) should be required in the dependency array.
 */
function ExternalScopeTest(): JSX.Element | null {
  // Test 1: External ID in computed property
  useEffect(() => {
    // Using piecePosMapSignal.value[externalId] where externalId is external
    console.info(piecePosMapSignal.value[externalId]);
    // Should require both piecePosMapSignal.value and piecePosMapSignal.value[externalId] in deps
  }, [piecePosMapSignal.value]); // Missing dependency: piecePosMapSignal.value[externalId]

  // Test 2: External ID in computed property with callback
  useCallback(() => {
    // Using piecePosMapSignal.value[externalId] where externalId is external
    const position = piecePosMapSignal.value[externalId];
    return position;
    // Should require both piecePosMapSignal.value and piecePosMapSignal.value[externalId] in deps
  }, [piecePosMapSignal.value, piecePosMapSignal.value[externalId]]); // This is correct

  return null;
}

/**
 * Test Component for Assignment-Only Operations
 *
 * When a computed property is only used for assignment (write operations),
 * it should not be required in the dependency array.
 */
function AssignmentOnlyTest(): JSX.Element | null {
  // Test 1: Assignment-only to computed property
  useEffect(() => {
    // Assignment-only to computed property
    piecePosMapSignal.value[externalId] = [1, 2];
    // Should not require any dependencies
  }, []); // This is correct - no dependencies needed

  // Test 2: Multiple assignments to computed properties

  useEffect(() => {
    // Multiple assignments, all write-only
    piecePosMapSignal.value[externalId] = [3, 4];
    piecePosMapSignal.value['another'] = [5, 6];
    // Should not require any dependencies
  }, [piecePosMapSignal]); // Unnecessary dependency: piecePosMapSignal

  return null;
}

/**
 * Test Component for Mixed Read/Write Operations
 *
 * When a computed property is used for both reading and writing,
 * it should be required in the dependency array.
 */

function MixedTest(): JSX.Element | null {
  const store = useSignals(1);

  // Test 1: Both read and write to computed property with external ID
  try {
    useEffect(() => {
      // Both read and write to computed property
      const pos = piecePosMapSignal.value[externalId];

      if (!pos) {
        return;
      }

      piecePosMapSignal.value[externalId] = [pos[0] + 1, pos[1]];
      // Should require piecePosMapSignal.value[externalId]
    }, []); // Missing dependency: piecePosMapSignal.value[externalId]

    // Test 2: Read from one property, write to another

    useEffect(() => {
      // Read from one property, write to another
      const pos = piecePosMapSignal.value[externalId];

      if (!pos) {
        return;
      }

      piecePosMapSignal.value.another = pos;
      // Should require piecePosMapSignal.value[externalId]
    }, [piecePosMapSignal.value]); // Missing dependency: piecePosMapSignal.value[externalId]

    return null;
  } finally {
    store.f();
  }
}

export { InnerScopeTest, ExternalScopeTest, AssignmentOnlyTest, MixedTest };
