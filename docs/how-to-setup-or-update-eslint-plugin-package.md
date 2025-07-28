# How to Setup or Update an ESLint Plugin Package

This guide provides comprehensive instructions for setting up a new ESLint plugin package or updating an existing one, using `eslint-plugin-react-signals-hooks` as a reference implementation. The guide covers everything from initial setup to publishing your package.

## Prerequisites

- Node.js 18+ (LTS recommended)
- pnpm 8.x (for workspace management)
- Basic understanding of:
  - ESLint and its plugin system
  - TypeScript
  - Modern JavaScript/TypeScript build tools

## Table of Contents

- [How to Setup or Update an ESLint Plugin Package](#how-to-setup-or-update-an-eslint-plugin-package)
  - [Prerequisites](#prerequisites)
  - [Table of Contents](#table-of-contents)
  - [1. Setting Up a New Package](#1-setting-up-a-new-package)
    - [1.1 Initialize the Project](#11-initialize-the-project)
    - [1.2 Install Required Dependencies](#12-install-required-dependencies)
      - [Forbidden dependencies](#forbidden-dependencies)
    - [1.3 Set Up .gitignore](#13-set-up-gitignore)
    - [1.4 Initialize TypeScript](#14-initialize-typescript)
    - [1.5 Set Up ESLint Configuration](#15-set-up-eslint-configuration)
    - [1.6 Create Basic Project Structure](#16-create-basic-project-structure)
  - [2. Project Structure](#2-project-structure)
    - [Key Directories Explained](#key-directories-explained)
      - [`src/`](#src)
      - [`tests/`](#tests)
      - [`src/utils/`](#srcutils)
      - [`docs/rules/`](#docsrules)
  - [3. Configuration Files](#3-configuration-files)
    - [3.1 `package.json`](#31-packagejson)
    - [3.2 TypeScript Configuration](#32-typescript-configuration)
      - [Base `tsconfig.json`](#base-tsconfigjson)
      - [`tsconfig.cjs.json` (CommonJS)](#tsconfigcjsjson-commonjs)
      - [`tsconfig.esm.json` (ES Modules)](#tsconfigesmjson-es-modules)
      - [`tsconfig.types.json` (Type Declarations)](#tsconfigtypesjson-type-declarations)
    - [3.3 ESLint Configuration (ESLint 9+)](#33-eslint-configuration-eslint-9)
      - [`eslint.config.js` (for the plugin's source code and tests)](#eslintconfigjs-for-the-plugins-source-code-and-tests)
    - [TypeScript Configuration](#typescript-configuration)
      - [`tsconfig.json` (base config)](#tsconfigjson-base-config)
      - [`tsconfig.cjs.json`](#tsconfigcjsjson)
      - [`tsconfig.esm.json`](#tsconfigesmjson)
  - [4. Development Workflow](#4-development-workflow)
    - [4.1 Creating a New Rule](#41-creating-a-new-rule)
    - [4.2 Testing Your Rule](#42-testing-your-rule)
    - [4.3 Debugging Rules](#43-debugging-rules)
    - [4.4 Linting and Formatting](#44-linting-and-formatting)
    - [4.5 Building the Package](#45-building-the-package)
    - [4.6 Versioning and Publishing](#46-versioning-and-publishing)
    - [4.7 Continuous Integration](#47-continuous-integration)
  - [5. Testing](#5-testing)
    - [5.1 Test Structure](#51-test-structure)
    - [5.2 Test File Example](#52-test-file-example)
    - [5.3 Running Tests](#53-running-tests)
    - [5.4 Test Organization](#54-test-organization)
  - [6. Building and Publishing](#6-building-and-publishing)
    - [6.1 Building the Package](#61-building-the-package)
    - [6.2 Testing the Build](#62-testing-the-build)
    - [6.3 Publishing to npm](#63-publishing-to-npm)
  - [7. Updating an Existing Package](#7-updating-an-existing-package)
    - [7.1 Version Management](#71-version-management)
    - [7.2 Update Process](#72-update-process)
  - [Best Practices](#best-practices)
  - [Troubleshooting](#troubleshooting)

## 1. Setting Up a New Package

### 1.1 Initialize the Project

1. Create and navigate to your package directory:

   ```bash
   mkdir eslint-plugin-your-package-name
   cd eslint-plugin-your-package-name
   git init
   echo "# eslint-plugin-your-package-name" >> README.md
   ```

2. Initialize a new package with pnpm:

   ```bash
   pnpm init
   ```

   This will create a basic `package.json`. You'll want to update it with additional fields (see Section 3.1 for a complete example).

### 1.2 Install Required Dependencies

Install development dependencies:

```bash
# Core dependencies
pnpm add -D \
  @babel/eslint-parser \
  @babel/preset-env \
  @types/node \
  @typescript-eslint/eslint-plugin \
  @typescript-eslint/parser \
  eslint \
  eslint-plugin-es-x \
  eslint-plugin-import \
  eslint-plugin-json \
  eslint-plugin-n \
  eslint-plugin-optimize-regex \
  eslint-plugin-oxlint \
  eslint-plugin-promise \
  globals \
  typescript

# Peer dependencies (should be installed by the consumer)
pnpm add -D eslint typescript
```

#### Forbidden dependencies

jest and everything related to jest

prettier, and everything related to prettier

### 1.3 Set Up .gitignore

Create a `.gitignore` file:

```bash
echo "# Dependencies
node_modules/

# Build output
dist/

# IDE
.idea/

# Environment variables
.env
.env.*
.env.local

# Logs
*.log
npm-debug.log*
yarn-debug.log*
yarn-error.log*

# OS generated files
.DS_Store
.DS_Store?
._*
.Spotlight-V100
.Trashes
ehthumbs.db
Thumbs.db" > .gitignore
```

### 1.4 Initialize TypeScript

Create a basic `tsconfig.json`:

```bash
echo '{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "jsx": "react-jsx",
    "lib": ["ES2020"],
    "baseUrl": "."
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist"]
}' > tsconfig.json
```

### 1.5 Set Up ESLint Configuration

Create an `eslint.config.js` file (ESLint 9+ flat config format):

```bash
import babelParser from '@babel/eslint-parser';
import babelPresetEnv from '@babel/preset-env';
import typescript from '@typescript-eslint/eslint-plugin';
import tsParser from '@typescript-eslint/parser';
import pluginESx from 'eslint-plugin-es-x';
import importPlugin from 'eslint-plugin-import';
import json from 'eslint-plugin-json';
import nodePlugin from 'eslint-plugin-n';
import optimizeRegexPlugin from 'eslint-plugin-optimize-regex';
import oxlintPlugin from 'eslint-plugin-oxlint';
import promisePlugin from 'eslint-plugin-promise';
import globals from 'globals';
import eslintPlugin from 'eslint-plugin-eslint-plugin';

const commonRules = {
  // Disabled rules
  'n/no-missing-import': 'off',
  'n/no-extraneous-import': 'off',
  indent: 'off',
  'multiline-ternary': 'off',
  'func-call-spacing': 'off',
  'operator-linebreak': 'off',
  'space-before-function-paren': 'off',
  semi: ['error', 'always'],
  'comma-dangle': 'off',
  'dot-notation': 'off',
  'default-case-last': 'off',
  'no-undef': 'off',
  'no-use-before-define': 'off',
  'sort-imports': 'off',
  camelcase: 'off',
  'no-useless-return': 'off',
  'sort-requires/sort-requires': 'off',
  'no-unused-vars': 'off',

  // Import rules
  'import/order': [
    'error',
    {
      groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index'],
      'newlines-between': 'always',
      alphabetize: { order: 'asc', caseInsensitive: true },
    },
  ],
  'import/no-cycle': 'error',
  'import/no-unused-modules': ['error', { unusedExports: true }],

  // Enabled rules
  'no-console': ['error', { allow: ['warn', 'error', 'info', 'table', 'debug', 'clear'] }],
  'optimize-regex/optimize-regex': 'warn',
  'es-x/no-async-iteration': 'error',
  'es-x/no-malformed-template-literals': 'error',

  // Promise rules
  'promise/no-return-wrap': 'error',
  'promise/prefer-await-to-then': 'error',
  'promise/no-nesting': 'warn',
  'promise/always-return': 'error',
  'promise/catch-or-return': 'error',
  'promise/param-names': 'error',

  // Security
  'security/detect-object-injection': 'error',

  // TypeScript specific
  '@typescript-eslint/await-thenable': 'error',
  '@typescript-eslint/no-floating-promises': 'error',
  '@typescript-eslint/consistent-type-imports': 'error',
  '@typescript-eslint/no-explicit-any': 'warn',
};

const jsConfig = {
  files: ['**/*.{js,jsx,mjs}'],
  plugins: {
    'es-x': pluginESx,
    import: importPlugin,
  },
  languageOptions: {
    ecmaVersion: 2024,
    parser: babelParser,
    parserOptions: {
      sourceType: 'module',
      requireConfigFile: false,
      babelOptions: {
        babelrc: false,
        configFile: false,
        plugins: ['@babel/plugin-syntax-import-assertions'],
        presets: [[babelPresetEnv]],
      },
    },
  },
  rules: {
    ...commonRules,
    semi: ['error', 'always'],
    '@typescript-eslint/no-var-requires': 'off',
    '@typescript-eslint/explicit-function-return-type': 'off',
    '@typescript-eslint/explicit-module-boundary-types': 'off',
  },
};

const tsConfig = {
  files: ['**/*.{ts,tsx,mts}'],
  plugins: {
    'es-x': pluginESx,
    '@typescript-eslint': typescript,
    import: importPlugin,
  },
  languageOptions: {
    ecmaVersion: 2024,
    parser: tsParser,
    parserOptions: {
      sourceType: 'module',
      ecmaFeatures: {
        jsx: true,
      },
      project: './tsconfig.json',
      createDefaultProgram: true,
    },
  },
  rules: {
    ...commonRules,
    ...typescript.configs['recommended'].rules,

    // TypeScript specific rules
    '@typescript-eslint/array-type': ['error', { default: 'generic' }],
    'no-shadow': 'off',
    '@typescript-eslint/strict-boolean-expressions': 'error',
    '@typescript-eslint/no-unnecessary-condition': 'error',
    '@typescript-eslint/explicit-function-return-type': ['warn', { allowExpressions: true }],
    '@typescript-eslint/explicit-member-accessibility': 'off',
    '@typescript-eslint/no-use-before-define': [
      'error',
      { functions: false, classes: false, typedefs: false },
    ],
    '@typescript-eslint/no-unused-vars': [
      'error',
      { varsIgnorePattern: '^_', argsIgnorePattern: '^_' },
    ],
    'no-restricted-imports': 'off',
    '@typescript-eslint/no-restricted-imports': [
      'warn',
      {
        name: 'react-redux',
        importNames: ['useSelector', 'useDispatch'],
        message: 'Use typed hooks `useAppDispatch` and `useAppSelector` instead.',
      },
    ],
  },
};

export default [
  // Global ignores
  {
    ignores: [
      '**/node_modules/**',
      '**/dist/**',
      '**/coverage/**',
      '**/build/**',
      '**/.next/**',
      '**/out/**',
      '**/public/**',
      '**/*.d.ts',
    ],
  },
  
  // Apply configurations
  jsConfig,
  tsConfig,
];
```

Save this as `eslint.config.js` in your project root.

### 1.6 Create Basic Project Structure

Set up the initial directory structure:

```bash
mkdir -p src/rules src/utils src/types tests/rules docs/rules
```

Now your project is set up with the basic structure and configuration needed to start developing your ESLint plugin. The next sections will guide you through creating rules, testing, and publishing your package.

## 2. Project Structure

A well-organized project structure is crucial for maintainability and scalability. Here's the detailed structure

```text
eslint-plugin-your-package-name/
├── src/
│   └── rule-name.ts         # Rule implementation
│   │
│   ├── utils/                   # Shared utilities
│   │   ├── ast-utils.ts         # AST helper functions
│   │   ├── type-utils.ts        # Type-related utilities
│   │   └── index.ts             # Utility exports
│   │
│   └── index.ts                 # Main entry point that exports all rules
│
├── tests/                       # Test files
│   └── rule-name.tsx
│
├── docs/                        # Documentation
│   ├── rules/                   # Rule documentation
│   │   └── rule-name.md         # Documentation for each rule
│   └── ...                      # Additional documentation
│
├── specs/                       # Test specifications (optional)
├── eslint.config.js            # ESLint configuration (ESLint 9+)
├── tsconfig.json                # Base TypeScript configuration
├── tsconfig.cjs.json            # CJS build configuration
├── tsconfig.esm.json            # ESM build configuration
├── tsconfig.types.json          # Type declarations configuration
├── package.json                 # Project configuration
└── README.md                    # Project documentation
```

### Key Directories Explained

#### `src/`

Each rule should be in its own directory with the following structure:

- `index.ts`: The main rule implementation

Example rule structure:

use packages/eslint-plugin-react-signals-hooks/docs/how-to-create-new-rule.md

#### `tests/`

Test files should mirror the structure of `src/` with separate files for valid and invalid cases.

#### `src/utils/`

Contains shared utilities used across multiple rules. For example:

- AST traversal helpers
- Type checking utilities
- Common validation logic

#### `docs/rules/`

Each rule should have its own markdown file documenting:

- Rule purpose
- When to use it
- Options and their defaults
- Examples of correct and incorrect code
- Related rules

## 3. Configuration Files

### 3.1 `package.json`

Here's a comprehensive `package.json` configuration based on `eslint-plugin-react-signals-hooks`:

```json
{
  "name": "eslint-plugin-your-package-name",
  "version": "1.0.0",
  "description": "ESLint plugin for [your plugin's purpose]",
  "type": "module",
  "main": "dist/cjs/index.js",
  "module": "dist/esm/index.js",
  "types": "dist/types/index.d.ts",
  "files": [
    "dist/"
  ],
  "keywords": [
    "eslint",
    "eslintplugin",
    "eslint-plugin",
    "your-keywords"
  ],
  "author": "Your Name <your.email@example.com>",
  "license": "MIT",
  "repository": {
    "type": "git",
    "url": "https://github.com/ospm-app/eslint-plugin-your-package-name.git"
  },
  "homepage": "https://github.com/ospm-app/eslint-plugin-your-package-name#readme",
  "bugs": {
    "url": "https://github.com/ospm-app/eslint-plugin-your-package-name/issues"
  },
  "publishConfig": {
    "access": "public"
  },
  "peerDependencies": {
    "eslint": "^9.0.0",
    "typescript": ">=5.0.0"
  },
  "dependencies": {
    "eslint-rule-composer": "^1.0.0",
    "@typescript-eslint/utils": "^8.0.0"
  },
  "devDependencies": {
    "@types/eslint": "^9.0.0",
    "@types/estree": "^2.0.0",
    "@types/node": "^20.0.0",
    "@typescript-eslint/parser": "^8.0.0",
    "@typescript-eslint/eslint-plugin": "^8.0.0",
    "eslint": "^9.0.0",
    "typescript": "^5.0.0",
    "@typescript-eslint/rule-tester": "^8.0.0",
    "rimraf": "^5.0.0"
  },
  "scripts": {
    "build": "pnpm clean && pnpm build:cjs && pnpm build:esm && pnpm build:types",
    "build:cjs": "tsc --project tsconfig.cjs.json",
    "build:esm": "tsc --project tsconfig.esm.json",
    "build:types": "tsc --project tsconfig.types.json",
    "clean": "rimraf dist/",
    "lint": "eslint . --config eslint.config.js",
    "test": "pnpm build && pnpm test:all-rules",
    "test:all-rules": "eslint tests --config eslint.config.js",
    "test:watch": "pnpm test -- --watch",
    "prepack": "pnpm build",
    "prepublishOnly": "pnpm test"
  },
  "eslintIgnore": [
    "dist/",
    "node_modules/",
    "eslint.config.js"
  ]
}
```

### 3.2 TypeScript Configuration

#### Base `tsconfig.json`

```json
{
 "extends": "../../tsconfig.json",
 "compilerOptions": {
  "baseUrl": ".",
  "rootDir": "src",
  "lib": ["ES2024", "DOM"],
  "target": "ES2024",
  "module": "ESNext",
  "moduleResolution": "bundler",
  "jsx": "react-jsx",
  "jsxImportSource": "react",
  "composite": true,
  "types": [
   "node",
   "eslint",
   "react",
   "react-native",
   "react-dom",
   "@typescript-eslint/utils"
  ],
  "esModuleInterop": true,
  "skipLibCheck": true
 },
 "include": ["src/**/*"],
 "exclude": ["node_modules", "dist", "tests"]
}

```

#### `tsconfig.cjs.json` (CommonJS)

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "outDir": "./dist/cjs",
    "declaration": false,
    "declarationMap": false
  },
  "include": ["src/**/*.ts"]
}
```

#### `tsconfig.esm.json` (ES Modules)

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "ESNext",
    "outDir": "./dist/esm",
    "declaration": false,
    "declarationMap": false
  },
  "include": ["src/**/*.ts"]
}
```

#### `tsconfig.types.json` (Type Declarations)

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "declaration": true,
    "emitDeclarationOnly": true,
    "outDir": "./dist/types",
    "noEmit": false
  },
  "include": ["src/**/*.ts"]
}
```

### 3.3 ESLint Configuration (ESLint 9+)

#### `eslint.config.js` (for the plugin's source code and tests)

### TypeScript Configuration

Create these TypeScript configuration files:

#### `tsconfig.json` (base config)

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "node",
    "esModuleInterop": true,
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "exclude": ["node_modules", "dist", "**/*.test.ts"]
}
```

#### `tsconfig.cjs.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "CommonJS",
    "outDir": "./dist/cjs",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

#### `tsconfig.esm.json`

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "module": "ESNext",
    "outDir": "./dist/esm",
    "rootDir": "./src"
  },
  "include": ["src"]
}
```

## 4. Development Workflow

### 4.1 Creating a New Rule

1. **Create the rule directory and files**:

   ```bash
   mkdir -p src/rules/your-rule-name tests/rules/your-rule-name docs/rules
   touch src/rules/your-rule-name/index.ts
   touch src/rules/your-rule-name/schema.json
   touch tests/rules/your-rule-name/valid.ts
   touch tests/rules/your-rule-name/invalid.ts
   touch docs/rules/your-rule-name.md
   ```

2. **Implement the rule**:
   - Use `createRule` from `@typescript-eslint/utils`
   - Define the rule metadata (name, type, docs, schema, messages)
   - Implement the rule logic in the `create` function

3. **Register the rule** in `src/index.ts`:

   ```typescript
   import yourRule from './rules/your-rule-name';
   
   export const rules = {
     'your-rule-name': yourRule,
   };
   ```

### 4.2 Testing Your Rule

1. **Write test cases**:
   - Create valid and invalid test cases in the respective files
   - Use `RuleTester` from `@typescript-eslint/rule-tester`
   - Test edge cases and different rule configurations

2. **Run tests**:

   ```bash
   # Run all tests
   pnpm test
   
   # Run tests in watch mode
   pnpm test:watch
   
   # Run tests for a specific rule
   pnpm test tests/rules/your-rule-name
   ```

### 4.3 Debugging Rules

1. **Use VS Code debugger**:
   Add this to your `.vscode/launch.json`:

   ```json
   {
     "version": "0.2.0",
     "configurations": [
       {
         "type": "node",
         "request": "launch",
         "name": "Debug ESLint Rule",
         "program": "${workspaceFolder}/node_modules/.bin/eslint",
         "args": [
           "--no-eslintrc",
           "-c", ".eslintrc.test.js",
           "--rule", '"your-rule-name: [\"error\"]',
           "tests/rules/your-rule-name/invalid.ts"
         ],
         "console": "integratedTerminal",
         "internalConsoleOptions": "neverOpen",
         "skipFiles": ["<node_internals>/**"]
       }
     ]
   }
   ```

2. **Add debug logs**:

   ```typescript
   import { debug } from '../utils/debug';
   
   // In your rule:
   create(context) {
     debug('Rule context:', context);
     // ...
   }
   ```

### 4.4 Linting and Formatting

1. **Lint your code**:

   ```bash
   pnpm lint
   ```

2. **Auto-fix issues** (when possible):

   ```bash
   pnpm lint --fix
   ```

### 4.5 Building the Package

```bash
# Build all targets (CJS, ESM, types)
pnpm build

# Build specific target
pnpm build:cjs
pnpm build:esm
pnpm build:types
```

### 4.6 Versioning and Publishing

1. **Update version** (using npm version or manually in package.json)
2. **Update CHANGELOG.md** with the changes
3. **Commit and tag** the release
4. **Publish** to npm:

   ```bash
   npm publish --access public
   ```

5. **Push tags** to GitHub:

   ```bash
   git push --follow-tags
   ```

### 4.7 Continuous Integration

Set up GitHub Actions (`.github/workflows/ci.yml`):

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: pnpm/action-setup@v2
        with:
          version: 8
      - uses: actions/setup-node@v3
        with:
          node-version: '18.x'
          cache: 'pnpm'
      - run: pnpm install
      - run: pnpm test
      - run: pnpm build
```

1. **Create a new rule**:
   - Add a new file in `src/rules/`
   - Export the rule with meta information
   - Implement the rule logic

2. **Export the rule** in `src/index.ts`:

   ```typescript
   import yourRule from './rules/your-rule';
   
   export const rules = {
     'your-rule': yourRule,
   };
   ```

3. **Test your rule**:
   - Create test files in `tests/your-rule/`
   - Add test cases for both valid and invalid code

## 5. Testing

### 5.1 Test Structure

Tests are organized in the `tests/` directory, with each rule having its own test file. The test files use a pattern of defining React components that either should or shouldn't trigger the rule being tested.

### 5.2 Test File Example

Here's an example test file structure from the project:

```typescript
// tests/prefer-signal-in-jsx/prefer-signal-in-jsx.test.tsx
import { signal } from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { type JSX } from 'react';

// This component should trigger ESLint warnings for using .value in JSX
export function TestSignalValueInJSX(): JSX.Element {
  useSignals();
  const messageSignal = signal('Hello World');
  
  // This should trigger a warning - using .value in JSX
  return <div>{messageSignal.value}</div>;
}

// This component should NOT trigger warnings - using signals directly in JSX
export function TestCorrectSignalUsageInJSX(): JSX.Element {
  useSignals();
  const messageSignal = signal('Hello World');
  
  // This is correct usage - signal without .value in JSX
  return <div>{messageSignal}</div>;
}
```

### 5.3 Running Tests

To run the tests, use the following command:

```bash
pnpm test
```

This will run all test files in the `tests/` directory and report any rule violations.

### 5.4 Test Organization

Each test file should:

1. Import necessary dependencies (signals, React types)
2. Define test components that demonstrate both correct and incorrect patterns
3. Use clear, descriptive function names that indicate what's being tested
4. Include comments explaining why certain patterns should trigger warnings
5. Cover edge cases and different usage scenarios

## 6. Building and Publishing

### 6.1 Building the Package

To build the package for distribution:

```bash
# Build all targets (ESM, CJS, and TypeScript declarations)
pnpm build

# Build specific targets
pnpm build:esm    # ES Modules
pnpm build:cjs    # CommonJS
pnpm build:types  # TypeScript declarations
```

This will generate the following directory structure in the `dist/` folder:

- `esm/` - ES Modules
- `cjs/` - CommonJS modules
- `types/` - TypeScript type declarations

### 6.2 Testing the Build

Before publishing, verify the build output:

```bash
# Check the build output structure
ls -R dist/

# Verify the package contents without publishing
npm pack --dry-run
```

### 6.3 Publishing to npm

1. **Login to npm** (if not already logged in):

   ```bash
   npm login
   ```

2. **Publish the package**:

   ```bash
   # For public packages
   npm publish --access public
   
   # For scoped packages (if applicable)
   # npm publish --access public --tag latest
   ```

3. **Verify the published package**:
   - Check the package on [npmjs.com](https://www.npmjs.com/)
   - Install it in a test project to verify everything works as expected

## 7. Updating an Existing Package

### 7.1 Version Management

Follow semantic versioning for updates:

- **Patch version** (`1.0.x`): Backward-compatible bug fixes
- **Minor version** (`1.x.0`): New features that are backward-compatible
- **Major version** (`x.0.0`): Breaking changes that require user action

### 7.2 Update Process

1. **Update Dependencies**:

   ```bash
   # Update all dependencies to their latest versions
   pnpm update
   
   # Or update specific packages
   pnpm update <package-name>@<version>
   ```

2. **Update Version Number**:

   ```bash
   # Update version and create git tag automatically
   npm version patch  # or minor, or major
   
   # Or update package.json manually
   # Then create a git tag: git tag -a v1.0.0 -m "Version 1.0.0"
   ```

3. **Update CHANGELOG.md**:
   Document all changes following this format:

   ```markdown
   ## [Unreleased]
   ### Added
   - New feature X
   
   ### Changed
   - Improved Y
   
   ### Fixed
   - Fixed bug Z
   
   ## [1.0.0] - 2025-01-01
   Initial release
   ```

4. **Test Thoroughly**:

   ```bash
   # Run all tests
   pnpm test
   
   # Build the package
   pnpm build
   
   # Verify the package contents
   npm pack --dry-run
   
   # Test in a real project
   cd /path/to/test/project
   pnpm link /path/to/your/plugin
   ```

5. **Commit and Tag**:

   ```bash
   git add .
   git commit -m "chore: release v1.0.0"
   git tag -a v1.0.0 -m "Version 1.0.0"
   ```

6. **Publish the Update**:

   ```bash
   # Publish to npm
   npm publish
   
   # Or for public scoped packages
   # npm publish --access public
   
   # Push changes and tags to GitHub
   git push origin main --follow-tags
   ```

7. **Create a GitHub Release**:
   - Go to your repository on GitHub
   - Click on "Releases"
   - Click "Draft a new release"
   - Select the tag you just created
   - Use the same content as your CHANGELOG.md for the release notes
   - Publish the release

## Best Practices

- Write comprehensive tests for all rules
- Document all rules in the `docs/rules/` directory
- Follow the [ESLint Rule Guidelines](https://eslint.org/docs/latest/extend/custom-rules)
- Use TypeScript for type safety
- Keep the changelog up to date
- Use semantic versioning
- Write clear error messages
- Provide auto-fix capabilities when possible

## Troubleshooting

- **Build issues**: Check TypeScript configuration and file paths
- **Test failures**: Ensure test files match the expected format
- **Publishing errors**: Verify npm authentication and package name availability
- **ESLint integration**: Check the plugin name and rule naming in your ESLint config
