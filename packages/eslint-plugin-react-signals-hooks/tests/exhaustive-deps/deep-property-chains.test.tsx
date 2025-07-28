import { signal } from "@preact/signals-react";
import { useSignals } from "@preact/signals-react/runtime";
import { type JSX, useCallback, useMemo } from "react";
import { Pressable, Text, View } from "react-native";

type HexId = "a" | "b" | "c";

type HexColor = "white" | "black" | "grey";

type SecondRowDirection =
	| "topRight2"
	| "right2"
	| "bottomRight2"
	| "bottomLeft2"
	| "left2"
	| "topLeft2";

type Neighbor = {
	id: HexId | "";
	position: [number, number, number] | null;
};

type NeighborN = {
	id: Array<HexId>;
	position: Array<[number, number, number]>;
};

type FirstRowDirection =
	| "topRight"
	| "right"
	| "bottomRight"
	| "bottomLeft"
	| "left"
	| "topLeft";

type DiagonalDirection =
	| "top"
	| "rightTop"
	| "rightBottom"
	| "bottom"
	| "leftBottom"
	| "leftTop";

type KnightDirection =
	| "topRight2TopLeft"
	| "topRight2Right"
	| "right2TopRight"
	| "right2BottomRight"
	| "bottomRight2Right"
	| "bottomRight2BottomLeft"
	| "bottomLeft2BottomRight"
	| "bottomLeft2Left"
	| "left2BottomLeft"
	| "left2TopLeft"
	| "topLeft2Left"
	| "topLeft2TopRight";

type NeighborDirection =
	| FirstRowDirection
	| DiagonalDirection
	| KnightDirection;

type NDiagonalDirection =
	| "topRightN"
	| "rightN"
	| "bottomRightN"
	| "bottomLeftN"
	| "leftN"
	| "topLeftN"
	| "topN"
	| "rightTopN"
	| "rightBottomN"
	| "bottomN"
	| "leftBottomN"
	| "leftTopN";

type NRowDirection =
	| "topRightN"
	| "rightN"
	| "bottomRightN"
	| "bottomLeftN"
	| "leftN"
	| "topLeftN"
	| "topN"
	| "rightTopN"
	| "rightBottomN"
	| "bottomN"
	| "leftBottomN"
	| "leftTopN";

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

export type PlayerColor = "w" | "b" | "g";

const currentPlayerSignal = signal<PlayerColor>("w");

const hexagonsSignal = signal<Record<HexId, Hexagon>>({
	a: {
		id: "a",
		color: "white",
		side: true,
		coordinate: [0, 0, 0] as const,
		neighbors: {
			topRight: {
				id: "a",
				position: [1, 0, 0] as const,
			},
			right: {
				id: "b",
				position: [0, 1, 0] as const,
			},
			bottomRight: {
				id: "c",
				position: [1, 1, 0] as const,
			},
			bottomLeft: {
				id: "a",
				position: [0, 0, 1] as const,
			},
			left: {
				id: "b",
				position: [1, 0, 1] as const,
			},
			topLeft: {
				id: "c",
				position: [0, 1, 1] as const,
			},
			top: {
				id: "a",
				position: [0, 0, 0] as const,
			},
			rightTop: {
				id: "b",
				position: [0, 0, 0] as const,
			},
			rightBottom: {
				id: "c",
				position: [0, 0, 0] as const,
			},
			bottom: {
				id: "a",
				position: [0, 0, 0] as const,
			},
			leftBottom: {
				id: "b",
				position: [0, 0, 0] as const,
			},
			leftTop: {
				id: "c",
				position: [0, 0, 0] as const,
			},
			topRight2TopLeft: {
				id: "a",
				position: [0, 0, 0] as const,
			},
			topRight2Right: {
				id: "b",
				position: [0, 0, 0] as const,
			},
			right2TopRight: {
				id: "c",
				position: [0, 0, 0] as const,
			},
			right2BottomRight: {
				id: "a",
				position: [0, 0, 0] as const,
			},
			bottomRight2Right: {
				id: "b",
				position: [0, 0, 0] as const,
			},
			bottomRight2BottomLeft: {
				id: "c",
				position: [0, 0, 0] as const,
			},
			bottomLeft2BottomRight: {
				id: "a",
				position: [0, 0, 0] as const,
			},
			bottomLeft2Left: {
				id: "b",
				position: [0, 0, 0] as const,
			},
			left2BottomLeft: {
				id: "c",
				position: [0, 0, 0] as const,
			},
			left2TopLeft: {
				id: "a",
				position: [0, 0, 0] as const,
			},
			topLeft2Left: {
				id: "b",
				position: [0, 0, 0] as const,
			},
			topLeft2TopRight: {
				id: "c",
				position: [0, 0, 0] as const,
			},
			topRight2: {
				id: ["a"],
				position: [[0, 0, 0]] as const,
			},
			right2: {
				id: ["b"],
				position: [[0, 0, 0]] as const,
			},
			bottomRight2: {
				id: ["c"],
				position: [[0, 0, 0]] as const,
			},
			bottomLeft2: {
				id: ["a"],
				position: [[0, 0, 0]] as const,
			},
			left2: {
				id: ["b"],
				position: [[0, 0, 0]] as const,
			},
			topLeft2: {
				id: ["c"],
				position: [[0, 0, 0]] as const,
			},
			topRightN: {
				id: ["a"],
				position: [[0, 0, 0]] as const,
			},
			rightN: {
				id: ["b"],
				position: [[0, 0, 0]] as const,
			},
			bottomRightN: {
				id: ["c"],
				position: [[0, 0, 0]] as const,
			},
			bottomLeftN: {
				id: ["a"],
				position: [[0, 0, 0]] as const,
			},
			leftN: {
				id: ["b"],
				position: [[0, 0, 0]] as const,
			},
			topLeftN: {
				id: ["c"],
				position: [[0, 0, 0]] as const,
			},
			topN: {
				id: ["a"],
				position: [[0, 0, 0]] as const,
			},
			rightTopN: {
				id: ["b"],
				position: [[0, 0, 0]] as const,
			},
			rightBottomN: {
				id: ["c"],
				position: [[0, 0, 0]] as const,
			},
			bottomN: {
				id: ["a"],
				position: [[0, 0, 0]] as const,
			},
			leftBottomN: {
				id: ["b"],
				position: [[0, 0, 0]] as const,
			},
			leftTopN: {
				id: ["c"],
				position: [[0, 0, 0]] as const,
			},
		},
	},
	b: {
		id: "b",
		color: "black",
		side: false,
		coordinate: [1, 0, 0] as const,
		neighbors: {
			topRight: {
				id: "a",
				position: [1, 0, 0] as const,
			},
			right: {
				id: "b",
				position: [0, 1, 0] as const,
			},
			bottomRight: {
				id: "c",
				position: [1, 1, 0] as const,
			},
			bottomLeft: {
				id: "a",
				position: [0, 0, 1] as const,
			},
			left: {
				id: "b",
				position: [1, 0, 1] as const,
			},
			topLeft: {
				id: "c",
				position: [0, 1, 1] as const,
			},
			top: {
				id: "a",
				position: [0, 0, 0] as const,
			},
			rightTop: {
				id: "b",
				position: [0, 0, 0] as const,
			},
			rightBottom: {
				id: "c",
				position: [0, 0, 0] as const,
			},
			bottom: {
				id: "a",
				position: [0, 0, 0] as const,
			},
			leftBottom: {
				id: "b",
				position: [0, 0, 0] as const,
			},
			leftTop: {
				id: "c",
				position: [0, 0, 0] as const,
			},
			topRight2TopLeft: {
				id: "a",
				position: [0, 0, 0] as const,
			},
			topRight2Right: {
				id: "b",
				position: [0, 0, 0] as const,
			},
			right2TopRight: {
				id: "c",
				position: [0, 0, 0] as const,
			},
			right2BottomRight: {
				id: "a",
				position: [0, 0, 0] as const,
			},
			bottomRight2Right: {
				id: "b",
				position: [0, 0, 0] as const,
			},
			bottomRight2BottomLeft: {
				id: "c",
				position: [0, 0, 0] as const,
			},
			bottomLeft2BottomRight: {
				id: "a",
				position: [0, 0, 0] as const,
			},
			bottomLeft2Left: {
				id: "b",
				position: [0, 0, 0] as const,
			},
			left2BottomLeft: {
				id: "c",
				position: [0, 0, 0] as const,
			},
			left2TopLeft: {
				id: "a",
				position: [0, 0, 0] as const,
			},
			topLeft2Left: {
				id: "b",
				position: [0, 0, 0] as const,
			},
			topLeft2TopRight: {
				id: "c",
				position: [0, 0, 0] as const,
			},
			topRight2: {
				id: ["a"],
				position: [[0, 0, 0]] as const,
			},
			right2: {
				id: ["b"],
				position: [[0, 0, 0]] as const,
			},
			bottomRight2: {
				id: ["c"],
				position: [[0, 0, 0]] as const,
			},
			bottomLeft2: {
				id: ["a"],
				position: [[0, 0, 0]] as const,
			},
			left2: {
				id: ["b"],
				position: [[0, 0, 0]] as const,
			},
			topLeft2: {
				id: ["c"],
				position: [[0, 0, 0]] as const,
			},
			topRightN: {
				id: ["a"],
				position: [[0, 0, 0]] as const,
			},
			rightN: {
				id: ["b"],
				position: [[0, 0, 0]] as const,
			},
			bottomRightN: {
				id: ["c"],
				position: [[0, 0, 0]] as const,
			},
			bottomLeftN: {
				id: ["a"],
				position: [[0, 0, 0]] as const,
			},
			leftN: {
				id: ["b"],
				position: [[0, 0, 0]] as const,
			},
			topLeftN: {
				id: ["c"],
				position: [[0, 0, 0]] as const,
			},
			topN: {
				id: ["a"],
				position: [[0, 0, 0]] as const,
			},
			rightTopN: {
				id: ["b"],
				position: [[0, 0, 0]] as const,
			},
			rightBottomN: {
				id: ["c"],
				position: [[0, 0, 0]] as const,
			},
			bottomN: {
				id: ["a"],
				position: [[0, 0, 0]] as const,
			},
			leftBottomN: {
				id: ["b"],
				position: [[0, 0, 0]] as const,
			},
			leftTopN: {
				id: ["c"],
				position: [[0, 0, 0]] as const,
			},
		},
	},
	c: {
		id: "c",
		color: "grey",
		side: true,
		coordinate: [0, 1, 0] as const,
		neighbors: {
			topRight: {
				id: "a",
				position: [1, 0, 0] as const,
			},
			right: {
				id: "b",
				position: [0, 1, 0] as const,
			},
			bottomRight: {
				id: "c",
				position: [1, 1, 0] as const,
			},
			bottomLeft: {
				id: "a",
				position: [0, 0, 1] as const,
			},
			left: {
				id: "b",
				position: [1, 0, 1] as const,
			},
			topLeft: {
				id: "c",
				position: [0, 1, 1] as const,
			},
			top: {
				id: "a",
				position: [0, 0, 0] as const,
			},
			rightTop: {
				id: "b",
				position: [0, 0, 0] as const,
			},
			rightBottom: {
				id: "c",
				position: [0, 0, 0] as const,
			},
			bottom: {
				id: "a",
				position: [0, 0, 0] as const,
			},
			leftBottom: {
				id: "b",
				position: [0, 0, 0] as const,
			},
			leftTop: {
				id: "c",
				position: [0, 0, 0] as const,
			},
			topRight2TopLeft: {
				id: "a",
				position: [0, 0, 0] as const,
			},
			topRight2Right: {
				id: "b",
				position: [0, 0, 0] as const,
			},
			right2TopRight: {
				id: "c",
				position: [0, 0, 0] as const,
			},
			right2BottomRight: {
				id: "a",
				position: [0, 0, 0] as const,
			},
			bottomRight2Right: {
				id: "b",
				position: [0, 0, 0] as const,
			},
			bottomRight2BottomLeft: {
				id: "c",
				position: [0, 0, 0] as const,
			},
			bottomLeft2BottomRight: {
				id: "a",
				position: [0, 0, 0] as const,
			},
			bottomLeft2Left: {
				id: "b",
				position: [0, 0, 0] as const,
			},
			left2BottomLeft: {
				id: "c",
				position: [0, 0, 0] as const,
			},
			left2TopLeft: {
				id: "a",
				position: [0, 0, 0] as const,
			},
			topLeft2Left: {
				id: "b",
				position: [0, 0, 0] as const,
			},
			topLeft2TopRight: {
				id: "c",
				position: [0, 0, 0] as const,
			},
			topRight2: {
				id: ["a"],
				position: [[0, 0, 0]] as const,
			},
			right2: {
				id: ["b"],
				position: [[0, 0, 0]] as const,
			},
			bottomRight2: {
				id: ["c"],
				position: [[0, 0, 0]] as const,
			},
			bottomLeft2: {
				id: ["a"],
				position: [[0, 0, 0]] as const,
			},
			left2: {
				id: ["b"],
				position: [[0, 0, 0]] as const,
			},
			topLeft2: {
				id: ["c"],
				position: [[0, 0, 0]] as const,
			},
			topRightN: {
				id: ["a"],
				position: [[0, 0, 0]] as const,
			},
			rightN: {
				id: ["b"],
				position: [[0, 0, 0]] as const,
			},
			bottomRightN: {
				id: ["c"],
				position: [[0, 0, 0]] as const,
			},
			bottomLeftN: {
				id: ["a"],
				position: [[0, 0, 0]] as const,
			},
			leftN: {
				id: ["b"],
				position: [[0, 0, 0]] as const,
			},
			topLeftN: {
				id: ["c"],
				position: [[0, 0, 0]] as const,
			},
			topN: {
				id: ["a"],
				position: [[0, 0, 0]] as const,
			},
			rightTopN: {
				id: ["b"],
				position: [[0, 0, 0]] as const,
			},
			rightBottomN: {
				id: ["c"],
				position: [[0, 0, 0]] as const,
			},
			bottomN: {
				id: ["a"],
				position: [[0, 0, 0]] as const,
			},
			leftBottomN: {
				id: ["b"],
				position: [[0, 0, 0]] as const,
			},
			leftTopN: {
				id: ["c"],
				position: [[0, 0, 0]] as const,
			},
		},
	},
});

type Props = {
	id: HexId;
};

function TestDeepPropertyChains({ id }: Props): JSX.Element {
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
