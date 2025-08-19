// This file intentionally contains signal mutations in a non-TSX context.
/** biome-ignore-all assist/source/organizeImports: off */
// The no-mutation-in-render rule must NOT warn here because there is no JSX/TSX.
/* eslint react-signals-hooks/signal-variable-name: off */
/* eslint react-signals-hooks/prefer-batch-updates: off */
/* eslint react-signals-hooks/forbid-signal-re-assignment: off */

import { signal, computed, effect } from "@preact/signals-react";

const count = signal(0);
const user = signal<{ name: string; age: number }>({ name: "A", age: 1 });

// Direct assignments outside JSX should not be flagged by this rule.
count.value = 1;
count.value++;
++count.value;
user.value.name = "B";

function doStuff() {
	// Still no JSX: should not be flagged by this rule.
	count.value = count.value + 1;
	user.value.age += 1;
}

doStuff();

// Even if functions are named like a component, without JSX it must be ignored by this rule.
export function MyComponentLikeName() {
	count.value = 5;
	user.value = { name: "C", age: 3 };
	return 123; // not JSX
}

// Ensure creator aliases do not matter in non-TSX files.
const c = computed(() => count.value + 1);
effect(() => {
	const _ = c.value; // reading only
});
