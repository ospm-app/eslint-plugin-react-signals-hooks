# Prefer useSignalRef Over useRef Rule Specification

Encourage using `useSignalRef` from `@preact/signals-react/utils` instead of React's `useRef` when a ref is read during render/JSX or otherwise expected to trigger reactive updates. `useSignalRef` creates a ref-like object whose `.current` is reactive and integrates with Signals. (See `@preact/signals-react` README: Utility Hooks → useSignalRef.)

## Plugin Scope

- Only hooks from `@preact/signals-react` and `@preact/signals-react/utils` are considered.
- Autofix suggestions add or augment imports from `@preact/signals-react/utils`.

## Core Functionality

The `prefer-use-signal-ref` rule detects `useRef` usages where the ref's `.current` is read in render (JSX or function body of a component/hook). In such cases, switching to `useSignalRef` makes the value reactive and better aligned with Signals-based code.

## Handled Cases

- **Reading `.current` during render**
  - `return <div>{ref.current}</div>`
  - `const v = ref.current; return <>{v}</>`
- **Reading `.current` in computed/derived reactive contexts within the same component**
  - e.g., used inside functions that are directly invoked during render
- **Initializer parity**
  - `useRef(init)` → `useSignalRef(init)` (preserve initializer expression and generics)
- **JSX ref attribute**
  - `ref={ref}` remains valid with `useSignalRef`

## Ignored/Non-triggering Cases

- Refs used only for imperative handles, not read during render (e.g., only passed to `ref` prop, or only read in effects/handlers)
- Callback refs (functions) are not transformed
- Values never read in render or reactive read contexts

## Configuration Options

### `onlyWhenReadInRender` (boolean)

- Default: `true`
- When `true`, suggest only if `.current` is read in render/JSX (or directly evaluated during render). When `false`, suggest for all `useRef` usages.

### `severity` (object)

- Controls per-message severity
- Keys: `{ "preferUseSignalRef": "error" | "warn" | "off" }`

### `performance` (object)

- Performance budgets and optional metrics logging
- Keys include: `maxTime`, `maxMemory`, `maxNodes`, `enableMetrics`, `logMetrics`, `maxOperations`

## Scope and Heuristics

- Trigger only inside components or custom hooks detected heuristically:
  - Functions with Capitalized names → components
  - Variables with Capitalized names initialized to arrow/function expressions → components
  - Functions whose names match `^use[A-Z]` → hooks
- A read of `refIdentifier.current` that is part of the render return path or an expression evaluated during render qualifies as a render read.

## Error Messages

- `preferUseSignalRef`: "Prefer useSignalRef over useRef when reading .current during render"

## Auto-fix Suggestions

Non-destructive suggestions are provided; a full automatic fix is offered only when safe:

- Ensure `import { useSignalRef } from '@preact/signals-react/utils'` exists (augment or insert)
- Replace `useRef` callee with `useSignalRef`, preserving:
  - Type parameters: `useRef<T>()` → `useSignalRef<T>(/* init */)`
  - Initializer argument: `useRef(init)` → `useSignalRef(init)`
- If `useRef` import becomes unused, suggest removing it
- No attempt is made to refactor callback refs to object refs

## Benefits

1. **Reactivity**: `.current` becomes reactive and participates in Signals updates
2. **Seamless JSX**: Read `ref.current` directly in JSX; UI updates when the ref changes
3. **Consistency**: Aligns ref usage with the Signals model used elsewhere in the codebase

## Migration Tips

1. Convert `useRef` to `useSignalRef` where the value is read in render
2. Keep the same generic and initial value semantics
3. Continue using `ref={ref}` in JSX; no changes required for attaching the ref
4. If you previously relied on `.current` reads in render without reactivity, verify that updates propagate as expected after migration

## Reference

- Preact Signals React README → Utility Hooks → `useSignalRef`
  - Package: `@preact/signals-react/utils`
  - Example:

    ```js
    import { useSignalRef } from "@preact/signals-react/utils";

    function Component() {
      const ref = useSignalRef(null);
      return <div ref={ref}>The ref's value is {ref.current}</div>;
    }
    ```
