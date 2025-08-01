/** biome-ignore-all lint/correctness/useExhaustiveDependencies: not relevant */
/** biome-ignore-all assist/source/organizeImports: off */
import { signal } from "@preact/signals-react";
import { useSignals } from "@preact/signals-react/runtime";
import { useCallback, useEffect, useMemo, type JSX } from "react";

const piecePosMapSignal = signal({
	test: [0, 1],
});

type Props = {
	id: "test";
};

export function TestComponent({ id }: Props): JSX.Element {
	useSignals();

	const countSignal = signal(0);

	const currentPosition = useMemo(() => {
		return [0, 1];
	}, []);

	// Test case 1: Assignment-only (should not require piecePosMapSignal)
	useEffect(() => {
		piecePosMapSignal.value[id] = [currentPosition[0], currentPosition[1]];
	}, [currentPosition, id, currentPosition[0], currentPosition[1]]);

	// Test case 2: Read and assignment (should require piecePosMapSignal.value[id])
	useEffect(() => {
		if (!piecePosMapSignal.value[id]) {
			piecePosMapSignal.value[id] = [currentPosition[0], currentPosition[1]];
		}
	}, [
		currentPosition,
		id,
		currentPosition[0],
		currentPosition[1],
		piecePosMapSignal.value[id],
	]);

	const onClick = useCallback((): void => {
		// Should not trigger warning missing dependency countSignal.value because it is
		countSignal.value++;
	}, []);

	return (
		<button type="button" onClick={onClick}>
			Increment
		</button>
	);
}
