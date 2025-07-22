import { useSignals } from "@preact/signals-react/runtime";
import { useMemo, type JSX } from "react";
import { Text } from "react-native";
import { hexagonsSignal } from "signals/sandbox.ts";
import type { HexId } from "types/game.ts";

type Props = {
	id: HexId;
	isSelected: boolean;
};

function TestNestedProperties({ id, isSelected }: Props): JSX.Element | null {
	// Test case 1: Should warn that hexagonsSignal.value[id] is redundant
	// when more specific nested properties are accessed
	useSignals();

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
	const color = useMemo(() => {
		if (isSelected) {
			return "#4a90e2";
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
