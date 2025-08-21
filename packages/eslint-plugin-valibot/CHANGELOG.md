# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-08-21

### Added

- Initial release of `@ospm/eslint-plugin-valibot`
- Rule: `zod-to-valibot`
  - Converts Zod schemas to Valibot, including chains → pipelines, top-level validators, object modes, tuple rest, parse/safeParse
  - Autofix support enabled
- Documentation and specs for `zod-to-valibot`
- Tests covering autofix and safety behavior
