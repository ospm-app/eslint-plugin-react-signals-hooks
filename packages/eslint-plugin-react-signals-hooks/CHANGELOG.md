# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.1.0] - 2025-07-25

### Added

- New rules for better signal management:
  - `no-non-signal-with-signal-suffix`: Enforces that variables with 'signal' in their name are actually signals
  - `no-signal-assignment-in-effect`: Prevents direct signal assignments inside effects
  - `no-signal-creation-in-component`: Discourages creating signals inside components
  - `prefer-batch-for-multi-mutations`: Encourages using batch for multiple signal updates
  - `prefer-batch-updates`: Suggests batching multiple signal updates
  - `prefer-signal-methods`: Promotes using signal-specific methods
  - `prefer-signal-reads`: Encourages reading signal values efficiently
  - `prefer-use-signal-over-use-state`: Suggests using `useSignal` over `useState`
  - `warn-on-unnecessary-untracked`: Warns about unnecessary `untracked` usage

### Changed

- Improved type safety with enhanced TypeScript definitions
- Added performance utilities for better optimization

### Fixed

- Various bug fixes and performance improvements

### Security

- N/A

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
