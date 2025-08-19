# `prefer-use-signal-ref-over-use-ref`

Encourage using `useSignalRef` from `@preact/signals-react/utils` instead of React's `useRef` when `.current` is read during render/JSX. Reading `.current` in render benefits from signal-backed reactivity, avoiding stale reads and enabling fine-grained updates.

## ❌ Incorrect

```tsx
import { useRef } from 'react';

function Example() {
  const divRef = useRef<HTMLDivElement | null>(null);
  return <div ref={divRef}>{divRef.current}</div>; // render read
}
```

```tsx
import { useRef } from 'react';

function Example() {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const value = inputRef.current; // read in render path
  return <span>{value}</span>;
}
```

```tsx
import { useRef } from 'react';

function Example() {
  const countRef = useRef<number | null>(0);
  return <div>{countRef.current}</div>;
}
```

## ✅ Correct

```tsx
import { useSignalRef } from '@preact/signals-react/utils';

function Example() {
  const divRef = useSignalRef<HTMLDivElement | null>(null);
  return <div ref={divRef}>{divRef.current}</div>;
}
```

```tsx
import { useRef, useEffect } from 'react';

// Imperative-only usage is fine
function Example() {
  const divRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    divRef.current?.focus();
  }, []);
  return <div ref={divRef} />; // no render reads
}
```

```tsx
import { useRef } from 'react';

// Reads only inside event handlers are ignored
function Example() {
  const divRef = useRef<HTMLDivElement | null>(null);
  return <button ref={divRef} onClick={() => console.log(divRef.current)} />;
}
```

## Options

- `onlyWhenReadInRender` (boolean, default `true`)
  - When `true`, the rule only suggests `useSignalRef` if `.current` is read during render/JSX. Imperative-only refs (effects/handlers) are ignored.
- `performance` (object)
  - Optional performance budget and metrics collection used internally by the rule.
- `severity` (object)
  - Allows customizing per-message severity if needed.

## Notes

- The rule preserves type parameters and initializer expressions in the autofix.
- It augments imports to add `useSignalRef` and can remove unused `useRef` imports.
- Callback refs (functions) are ignored.
