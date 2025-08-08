# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.1] - 2025-08-08

### Fixed

- Fixes to exhaustive-deps rule, more edge cases handled and tested

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
