# Bit Monorepo Integration Plan

This document outlines the strategy for integrating Bit into our monorepo to improve dependency management and component sharing.

## Current Structure

Our monorepo contains multiple ESLint-related packages:

- `eslint-plugin-react-signals-hooks`
- `eslint-plugin-arktype`
- `eslint-plugin-joi`
- `eslint-llm`
- `eslint-config-validation-schemas`

## Integration Goals

1. **Simplify Dependency Management**: Automatically handle dependencies across packages
2. **Improve Developer Experience**: Reduce manual package.json management
3. **Enable Component Sharing**: Make it easier to share and version components
4. **Maintain Existing Workflow**: Keep current build and test processes working

## Implementation Plan

### 1. Initial Setup

1. Install Bit CLI globally (if not already installed):

   ```bash
   npm install -g @teambit/bvm
   bvm install
   ```

2. Initialize Bit workspace in the root directory:

   ```bash
   bit init
   ```

   This will create:
   - `workspace.jsonc` - Bit workspace configuration
   - `.bit` directory - Bit's internal files
   - `.bitmap` - Tracks component files

### 2. Configure Workspace

Update `workspace.jsonc` with our configuration:

```json
{
  "$schema": "https://static.bit.dev/teambit/schemas/schema.json",
  "teambit.workspace/workspace": {
    "name": "eslint-plugins",
    "defaultScope": "your-org.your-scope"
  },
  "teambit.dependencies/dependency-resolver": {
    "packageManager": "teambit.dependencies/pnpm",
    "policy": {
      "dependencies": {},
      "peerDependencies": {
        "eslint": ">=8.57.1 || ^9.33.0"
      }
    }
  },
  "teambit.workspace/variants": {
    "*": {
      "teambit.typescript/tsconfig": {
        "tsconfig": "./tsconfig.base.json"
      }
    }
  }
}
```

### 3. Convert Existing Packages to Bit Components

For each package in `packages/`:

1. Create a new component:

   ```bash
   bit create node-module eslint-plugin-react-signals-hooks --namespace=eslint-plugins --aspect=teambit.harmony/node
   ```

2. Move package source code to the new component directory

3. Update component configuration in `workspace.jsonc` with specific package settings

### 4. Handle Dependencies

1. Install shared dependencies at workspace level:

   ```bash
   bit install typescript @types/node @typescript-eslint/parser @typescript-eslint/utils
   ```

2. Configure peer dependencies in `workspace.jsonc`

### 5. Update Build Process

1. Configure build pipeline in `workspace.jsonc`:

   ```json
   "teambit.workspace/variants": {
     "*": {
       "teambit.pkg/pkg": {
         "packageJson": {
           "main": "dist/{main}.js",
           "types": "dist/{main}.d.ts"
         }
       },
       "teambit.pipelines/builder": {
         "tasks": [
           {
             "name": "build",
             "task": "teambit.typescript/compiler:ts",
             "options": {
               "transpile": true
             }
           }
         ]
       }
     }
   }
   ```

### 6. Update CI/CD Pipeline

1. Update CI to use Bit commands:

   ```yaml
   - name: Install dependencies
     run: bit install
     
   - name: Build
     run: bit build
     
   - name: Test
     run: bit test
   ```

2. Configure Bit Cloud for component publishing

### 7. Migration Steps

1. **Phase 1**: Set up Bit alongside existing structure
   - Keep existing package.json files
   - Gradually migrate packages to Bit components
   - Test builds and dependencies

2. **Phase 2**: Full Migration
   - Remove individual package.json files
   - Update CI/CD to use Bit exclusively
   - Document new workflows

3. **Phase 3**: Optimization
   - Implement component versioning
   - Set up automated publishing
   - Document component usage

## Benefits

1. **Simplified Dependency Management**: Bit automatically tracks and manages dependencies
2. **Consistent Versions**: No more version conflicts between packages
3. **Better Developer Experience**: No need to manually manage package.json files
4. **Component Sharing**: Easily share components between projects
5. **Improved Performance**: Bit's caching and build optimizations

## Next Steps

1. Set up Bit workspace in a new branch
2. Migrate one package as a proof of concept
3. Test build and dependency resolution
4. Gather team feedback
5. Plan full migration
