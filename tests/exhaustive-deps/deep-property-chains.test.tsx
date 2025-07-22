import { useSignals } from "@preact/signals-react/runtime";
import { type JSX, useCallback, useMemo } from "react";
import { Pressable, Text, View } from "react-native";
import { currentPlayerSignal, hexagonsSignal } from "signals/sandbox.ts";
import type { HexId } from "types/game.ts";

type Props = {
	id: HexId;
};

function TestDeepPropertyChains({ id }: Props): JSX.Element {
	// Test case 1: Deep property chain access
	// Should detect hexagonsSignal.value[id].neighbors.top.id as missing dependency
	useSignals();

	const neighborTopId = useMemo(() => {
		return hexagonsSignal.value[id].neighbors.top.id;
	}, [id, hexagonsSignal.value[id].neighbors.top.id]);

	// Test case 2: Multiple deep property chain accesses
	// Should detect all the specific nested property dependencies
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
	const complexNeighborCheck = useMemo(() => {
		if (!hexagonsSignal.value[id]) {
			return false;
		}

		const hasTopNeighbor = hexagonsSignal.value[id].neighbors.top.id !== null;
		const hasRightNeighbor =
			hexagonsSignal.value[id].neighbors.rightTop.id !== null;

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

export default TestDeepPropertyChains;
