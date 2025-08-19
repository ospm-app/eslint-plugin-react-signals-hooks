# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.5.5] - 2025-08-19

### Fixed

- `prefer-show-over-ternary` fixes for edge cases

## [1.5.0] - 2025-08-18

### Added new rules

- `forbid-signal-update-in-computed`
  - Forbids updating signals inside `computed(...)` callbacks to keep them pure and read-only
  - Detects direct `.value` writes, `.set()`/`.update()` calls, batched writes via `batch()`, and writes via call-derived signals

### Improvements

- Various development experience improvements

## [1.4.0] - 2025-08-12

### Added new rules

- `forbid-signal-re-assignment`
- `forbid-signal-destructuring`

### Fixed

A ton of improvements to existing rules, autofixes.

## [1.3.0] - 2025-08-10

### Added

- New rule: `prefer-use-signal-ref-over-use-ref`
  - Encourages using `useSignalRef` instead of `useRef` when `.current` is read during render/JSX.
  - Autofix: adds `useSignalRef` import, replaces `useRef(...)` with `useSignalRef(...)`, preserves type params and initializer.
  - Config: `onlyWhenReadInRender` (default true), `performance` budget, `severity` mapping.
- Documentation: `docs/rules/prefer-use-signal-ref-over-use-ref.md` with incorrect/correct examples and options.
- Tests: added `tests/prefer-use-signal-ref-over-use-ref/` with ESLint configs and fixtures.

### Changed

- Exported the new rule from `src/index.ts` and enabled default severity in the recommended map.
- NPM scripts: added test/fix commands for the new rule and included them in aggregate runners.

## [1.2.8 - 1.2.23] - 2025-08-10

### Added

- A lot of improvements and edge cases handling for existing rules, autofixes.

### Changed

- Minor test configuration adjustments to align with existing rule test patterns.

## [1.2.7] - 2025-08-10

### fixed autofix for prefer-signal-reads

## [1.2.6] - 2025-08-10

### Added

- prefer-batch-updates: new diagnostic `nonUpdateSignalInBatch` to warn on signal reads inside `batch` callbacks without updates.
- Tests: comprehensive fixtures locking `prefer-batch-updates` behaviors (unnecessary batch unwrapping, nonUpdateSignalInBatch), plugin scope, and import augmentation across rules.

### Changed

- prefer-batch-updates: autofix for `removeUnnecessaryBatch` now replaces the enclosing `ExpressionStatement` and unwraps multi-statement batch bodies, preserving all inner statements.
- prefer-batch-updates: import-aware signal detection is the only supported mechanism; deprecated `suffix` option fully removed from rule types and schema.
- Docs/Specs: updated to reflect React-only scope (`@preact/signals-react`) and new/updated diagnostics and autofixes.

### Fixed

- prefer-batch-updates: resolved inflated "useBatch" counts by resetting analysis accumulators per top-level pass.
- Minor type cleanliness in signal read detection helpers.

## [1.2.5] - 2025-08-08

### Fixed

- exhaustive-deps: fix for sentinel-guarded base case
- exhaustive-deps: fix for ref-like variables

## [1.2.4] - 2025-08-08

### Fixed

- exhaustive-deps: refs should not be dependencies

## [1.2.3] - 2025-08-08

### Added

- prefer-signal-in-jsx: fixes for edge cases

### Fixed

- Fixes to exhaustive-deps rule, more edge cases handled and tested

## [1.2.2] - 2025-08-08

### Fixed

- exhaustive-deps: Do not require array/object method names as dependencies when used as callees
  (e.g., `.reduce`, `.map`, `.filter`). The rule now tracks only the object path, not the method name
  (e.g., `matrixSignal.value[rowIndex]`, without `.reduce`).
- exhaustive-deps: Allow listing only the base variable when it is directly read in sentinel guards
  (e.g., `x === null || x === 'loading'`). Avoid forcing deep property chains like `base.deep.prop`
  when `base` is declared and directly used in guards.

### Added

- Minimal regression test for sentinel-guarded base case: `tests/exhaustive-deps/sentinel-guarded-base.test.tsx`.
- Additional edge-case adjustments in `tests/exhaustive-deps/edge-cases.test.tsx`.

## [1.2.0] - 2025-07-30

- Fixed warning for signals assignments already inside batch call
- removed `prefer-batch-for-multi-mutations` rule, merged functionality with `prefer-batch-updates` rule
- fixed signal-variable-name rule autofix

## [1.1.1] - 2025-07-30

### Changed

- Updated README.md

## [1.1.0] - 2025-07-30

### Added

- New rules for comprehensive signal management:
  - `exhaustive-deps`: Ensures all dependencies are properly specified in effects and callbacks
  - `no-mutation-in-render`: Prevents direct signal mutations during render
  - `no-non-signal-with-signal-suffix`: Enforces that variables with 'signal' in their name are actually signals
  - `no-signal-assignment-in-effect`: Prevents direct signal assignments inside effects
  - `no-signal-creation-in-component`: Discourages creating signals inside components
  - `prefer-batch-for-multi-mutations`: Encourages using batch for multiple signal updates
  - `prefer-batch-updates`: Suggests batching multiple signal updates
  - `prefer-computed`: Promotes using computed signals for derived state
  - `prefer-for-over-map`: Suggests using `for` loops over `Array.map` for better performance
  - `prefer-show-over-ternary`: Recommends using `show` component over ternary expressions
  - `prefer-signal-effect`: Encourages using `useSignalEffect` for side effects
  - `prefer-signal-in-jsx`: Promotes using signals directly in JSX
  - `prefer-signal-methods`: Promotes using signal-specific methods
  - `prefer-signal-reads`: Encourages reading signal values efficiently
  - `prefer-use-signal-over-use-state`: Suggests using `useSignal` over `useState`
  - `require-use-signals`: Ensures proper signal usage in components
  - `restrict-signal-locations`: Controls where signals can be created
  - `signal-variable-name`: Enforces consistent naming for signal variables
  - `warn-on-unnecessary-untracked`: Warns about unnecessary `untracked` usage

### Changed

- Improved type safety with enhanced TypeScript definitions
- Added performance utilities for better optimization
- Added severity configuration for all rules
- Enhanced error messages and documentation for all rules
- Improved rule autofix capabilities
- Better handling of edge cases in all rules

### Fixed

- Fixed various edge cases in rule implementations
- Improved performance for large codebases
- Fixed TypeScript type inference in several rules
- Addressed false positives/negatives in rule detections
- Improved compatibility with different React versions

### Performance

- Optimized rule execution time
- Reduced memory usage during linting
- Improved caching mechanisms for better performance in watch mode

[1.1.0]: https://github.com/ospm-app/eslint-plugin-react-signals-hooks/releases/tag/v1.1.0

## [1.0.1] - 2025-07-22

### Fixed

- Install command in README:
  - `pnpm install --save-dev @ospm/eslint-plugin-react-signals-hooks`

[1.0.1]: https://github.com/ospm-app/eslint-plugin-react-signals-hooks/releases/tag/v1.0.1

## [1.0.0] - 2025-07-22

### Added

- Initial release of `@ospm/eslint-plugin-react-signals-hooks`
- Added the following rules:
  - `exhaustive-deps`: Enforce all dependencies are correctly specified in hooks
  - `no-mutation-in-render`: Prevent direct state mutations during render
  - `prefer-computed`: Enforce using computed values for derived state
  - `prefer-for-over-map`: Prefer `for` loops over `Array.map` for better performance
  - `prefer-show-over-ternary`: Encourage using the `Show` component over ternary operators
  - `prefer-signal-effect`: Enforce using `useSignalEffect` for side effects
  - `prefer-signal-in-jsx`: Encourage using signals directly in JSX
  - `require-use-signals`: Enforce using React Signals hooks for state management
  - `signal-variable-name`: Enforce consistent naming for signal variables

### Changed

- N/A (Initial release)

### Deprecated

- N/A (Initial release)

### Removed

- N/A (Initial release)

### Fixed

- N/A (Initial release)

### Security

- N/A (Initial release)

[1.0.0]: https://github.com/ospm-app/eslint-plugin-react-signals-hooks/releases/tag/v1.0.0

## [1.0.1] - 2025-07-22

### Fixed Install command

- `pnpm install --save-dev @ospm/eslint-plugin-react-signals-hooks`
