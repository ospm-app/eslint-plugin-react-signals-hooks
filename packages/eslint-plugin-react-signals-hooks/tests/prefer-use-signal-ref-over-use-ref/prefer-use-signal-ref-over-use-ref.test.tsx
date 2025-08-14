/** biome-ignore-all lint/correctness/useHookAtTopLevel: off */
/** biome-ignore-all assist/source/organizeImports: off */
import { useSignals } from "@preact/signals-react/runtime";
import { useEffect, useRef, type JSX } from "react";
import { useSignalRef } from "@preact/signals-react/utils";

// This component should trigger a warning - reading ref.current during render
export function TestReadRefCurrentInRender(): JSX.Element {
	const store = useSignals(1);

	try {
		const divRef = useRef<HTMLDivElement | null>(null); // Should warn to useSignalRef

		// @ts-expect-error
		return <div ref={divRef}>{divRef.current}</div>; // render read
	} finally {
		store.f();
	}
}

// This component should trigger a warning - React default import namespace usage
import React from "react";

export function TestReactDefaultNamespaceUseRef(): JSX.Element {
	const store = useSignals(1);

	try {
		const ref = React.useRef<HTMLDivElement | null>(null); // Should warn to useSignalRef

		// @ts-expect-error
		return <div ref={ref}>{ref.current}</div>;
	} finally {
		store.f();
	}
}

// This component should trigger a warning - namespace alias import usage
import * as R from "react";

export function TestNamespaceAliasUseRef(): JSX.Element {
	const store = useSignals(1);

	try {
		const ref = R.useRef<HTMLInputElement | null>(null); // Should warn to useSignalRef

		return (
			<div>
				<input ref={ref} />
				{ref.current as R.ReactNode}
			</div>
		);
	} finally {
		store.f();
	}
}

// This component should trigger a warning - read ref.current into a local and render it
export function TestReadRefCurrentViaLocal(): JSX.Element {
	const store = useSignals(1);

	try {
		const inputRef = useRef<HTMLInputElement | null>(null); // Should warn to useSignalRef

		const v = inputRef.current; // render read path

		// @ts-expect-error
		return <div ref={inputRef}>{v}</div>;
	} finally {
		store.f();
	}
}

// This component should NOT trigger warning - using useSignalRef and reading in render
export function TestUseSignalRefIsOK(): JSX.Element {
	const store = useSignals(1);

	try {
		const ref = useSignalRef<number | null>(0);

		return <div>The value is {ref.current}</div>;
	} finally {
		store.f();
	}
}

// This component should NOT trigger warning - useRef used only as an imperative handle (no render read)
export function TestImperativeOnlyRef(): JSX.Element {
	const store = useSignals(1);

	try {
		const buttonRef = useRef<HTMLButtonElement | null>(null);

		useEffect(() => {
			// Imperative access outside render path
			buttonRef.current?.focus();
		}, []);

		return (
			<button type="button" ref={buttonRef}>
				Focus me
			</button>
		);
	} finally {
		store.f();
	}
}

// This component should NOT trigger warning - callback ref
export function TestCallbackRef(): JSX.Element {
	const store = useSignals(1);

	try {
		const setNode = (node: HTMLDivElement | null): void => {
			// do something imperative
			if (node) {
				// noop
			}
		};

		return <div ref={setNode}>With callback ref</div>;
	} finally {
		store.f();
	}
}

// This component should trigger a warning - generics parity preserved
export function TestGenericRefRead(): JSX.Element {
	const store = useSignals(1);

	try {
		const canvasRef = useRef<HTMLCanvasElement | null>(null); // Should warn to useSignalRef

		return (
			<div>
				{canvasRef.current as R.ReactNode}
				<canvas ref={canvasRef} />
			</div>
		);
	} finally {
		store.f();
	}
}

// This component should NOT trigger warning - read ref.current only inside effect/handler
export function TestReadInEffectOnly(): JSX.Element {
	const store = useSignals(1);

	try {
		const divRef = useRef<HTMLDivElement | null>(null);

		useEffect(() => {
			// Read is outside render; should not trigger when onlyWhenReadInRender=true
			console.info("divRef:", divRef.current);
		}, []);

		return <div ref={divRef}>ok</div>;
	} finally {
		store.f();
	}
}
