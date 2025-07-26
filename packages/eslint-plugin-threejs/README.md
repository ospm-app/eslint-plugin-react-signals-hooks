# @ospm/eslint-plugin-threejs

> ESLint plugin for Three.js best practices and performance optimizations

[![npm version](https://img.shields.io/npm/v/@ospm/eslint-plugin-threejs.svg)](https://www.npmjs.com/package/@ospm/eslint-plugin-threejs)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

## Features

- **Performance Optimizations**: Enforce best practices for optimal Three.js performance
- **Deprecation Warnings**: Catch usage of deprecated Three.js APIs
- **Code Quality**: Improve code quality and maintainability
- **TypeScript Support**: First-class TypeScript support

## Installation

```bash
npm install --save-dev @ospm/eslint-plugin-threejs
# or
yarn add --dev @ospm/eslint-plugin-threejs
# or
pnpm add --save-dev @ospm/eslint-plugin-threejs
```

## Usage

Add `@ospm/threejs` to the plugins section of your `.eslintrc` configuration file. You can omit the `eslint-plugin-` prefix:

```json
{
  "plugins": ["@ospm/threejs"],
  "extends": ["plugin:@ospm/threejs/recommended"]
}
```

Or configure rules individually:

```json
{
  "plugins": ["@ospm/threejs"],
  "rules": {
    "@ospm/threejs/no-deprecated-geometry": "error"
  }
}
```

## Rules

| Rule | Description | Fixable | Recommended |
|------|-------------|----------|-------------|
| [no-deprecated-geometry](./docs/rules/no-deprecated-geometry.md) | Disallow usage of the deprecated THREE.Geometry class | ✅ | 🔧 |
| no-deprecated-tsl-blending-functions | Flag uses of old TSL blending methods | ✅ | 🔧 |
| no-deprecated-gamma-factor | Warn on setting renderer.gammaFactor | ✅ | 🔧 |
| no-legacy-examples-imports | Detect imports from deprecated /examples/js directory | ✅ | 🔧 |
| prefer-gpu-animation | Encourage GPU-based animations |  | 🔧 |
| enforce-clipping-planes | Ensure proper clipping plane setup |  | 🔧 |
| limit-shadow-casters | Limit number of shadow-casting objects |  | 🔧 |

🔧 = Fixable with `--fix`

## Recommended Configuration

This plugin exports a `recommended` configuration that enforces good practices.

## License

MIT © [OSPM Team](https://github.com/ospm-app)
