# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-27

### Added

- Initial release with three core rules:
  - `remove-use-memo`: Detects and removes unnecessary `React.useMemo()` calls
  - `remove-use-callback`: Detects and removes unnecessary `React.useCallback()` calls
  - `remove-memo`: Detects and removes unnecessary `React.memo()` HOC calls

### Features

- **Auto-fixing**: All rules support automatic code transformation
- **Safety Checks**: Built-in protections to prevent breaking changes
- **Performance Tracking**: Configurable performance limits and metrics
- **Type Safety**: Full TypeScript support with proper type preservation
- **Configurable Options**: Severity levels and performance settings

### Documentation

- Comprehensive README with usage examples
- Detailed rule documentation with examples
- Usage guide and migration strategy
- Safety considerations and best practices

### Testing

- Unit tests for all rules
- Integration tests with ESLint
- Auto-fix verification tests
- Performance benchmarking

### Configuration

- Recommended configuration preset
- Flat config (ESLint 9+) support
- Legacy config (ESint 8) support
- Individual rule configuration options

### Philosophy

- Follows React's philosophy that "memoization should be intentional"
- Promotes cleaner, more maintainable code
- Includes safety checks to prevent performance regressions
- Encourages measurement-based optimization
