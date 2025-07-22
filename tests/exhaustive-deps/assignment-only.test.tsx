import { signal } from "@preact/signals-react";
import { useSignals } from "@preact/signals-react/runtime";
import { useEffect, useMemo } from "react";

const piecePosMapSignal = signal({
	test: [0, 1],
});

type Props = {
	id: "test";
};

export function TestComponent({ id }: Props) {
	useSignals();

	const currentPosition = useMemo(() => [0, 1], []);

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

	return null;
}
