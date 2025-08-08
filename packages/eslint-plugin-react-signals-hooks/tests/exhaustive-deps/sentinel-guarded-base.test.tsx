/* eslint-disable react-signals-hooks/prefer-signal-effect */
/** biome-ignore-all lint/correctness/useHookAtTopLevel: not relevant */
/** biome-ignore-all assist/source/organizeImports: off */
import { useMemo, type JSX } from 'react';

// Minimal types to satisfy TS
type TravelOptions = { id?: string; dayIndex?: number | null };
interface ITravelFormHistoryData {
  travelPoints?: Array<TravelOptions | null | undefined> | null;
}

// This test ensures that when a base variable is guarded by sentinel checks
// (null or "loading"), listing the base in deps is sufficient even if deeper
// properties are used after the guard. The rule should NOT require deep chains
// like `selectedTrip.travelPoints` in the dependency array.
export function TestSentinelGuardedBase({
  selectedTrip,
  selectedDay,
}: {
  selectedTrip: ITravelFormHistoryData | 'loading' | null;
  selectedDay: number | null;
}): JSX.Element {
  const { count } = useMemo(() => {
    if (selectedTrip === null || selectedTrip === 'loading') {
      return { count: 0 };
    }

    // After the guard, it's safe to access deeper properties
    const length = (selectedTrip.travelPoints ?? []).filter(Boolean).length;

    // selectedDay included to mirror the user's example shape
    return { count: length + typeof selectedDay === 'number' ? selectedDay : 0 };
    // Correct: should allow listing only the base when it is directly used in guards
  }, [selectedTrip, selectedDay]);

  return <div>{count}</div>;
}
