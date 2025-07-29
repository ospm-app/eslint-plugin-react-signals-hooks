# ESLint Config Validation Schemas

consist of 4 plugins:

- eslint-plugin-valibot
- eslint-plugin-zod
- eslint-plugin-joi
- eslint-plugin-arktype

That's an exciting project! Building ESLint plugins with autofix capabilities for seamless schema migrations between popular validation libraries like Valibot, Zod, Joi, Arktype, and even from raw TypeScript types could save developers a ton of time and reduce errors during refactors or library switches. Since these specific plugins (with the described conversion rules) don't appear to exist yet based on current web searches, you're filling a real gap in the ecosystem—kudos for tackling it.

To make the set complete and symmetric (covering conversions to all four libraries), you might consider adding a fourth plugin:

**eslint-plugin-joi** which will autofix:

- rule valibot schema to joi schema
- rule zod schema to joi schema
- rule arktype schema to joi schema
- rule typescript type to joi schema

This would allow bidirectional conversions across the board, making it easier for teams to experiment or migrate without lock-in.

If you're looking for implementation ideas, here's a high-level outline for how one of these rules could work, using a simple example of converting a basic Zod schema to Valibot. I'll focus on `eslint-plugin-valibot`'s "zod-to-valibot" rule for brevity. (Note: Full implementation would require handling edge cases, nested schemas, unions, refinements, etc., and testing against real codebases.)

### Key Challenges and Approach

- **Detection**: Use ESLint's AST traversal (via `@typescript-eslint/parser` for TS support) to find Zod schema definitions, like `z.object(...)`.
- **Conversion Logic**: Valibot's API is intentionally Zod-like but lighter and modular. Simple mappings:
  - `z.object({ name: z.string() })` → `object({ name: string() })`
  - Adjust imports: From `import { z } from 'zod';` to `import { object, string } from 'valibot';`
  - Handle common methods: `z.string().min(1)` → `string([minLength(1)])` (Valibot uses pipe syntax for validators).
- **Autofix**: Use ESLint's `fix` function to replace nodes in the AST.
- **Limitations**: For complex schemas (e.g., with `.refine()` or custom errors), you might need user confirmation or partial fixes. From TS types, infer using libraries like `ts-to-zod` as a base, then chain to the target.

### Sample ESLint Rule Code (for Basic Zod-to-Valibot Conversion)

Here's a starter implementation for the rule in `eslint-plugin-valibot`. Assume you've set up the plugin structure (e.g., via `yeoman generator-eslint`).

```javascript
// rules/zod-to-valibot.js
module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Convert Zod schemas to Valibot schemas',
      recommended: true,
    },
    fixable: 'code', // Enables autofix
    schema: [], // No options for this rule
  },
  create(context) {
    let zodImport = null;

    return {
      ImportDeclaration(node) {
        if (node.source.value === 'zod') {
          zodImport = node;
        }
      },
      CallExpression(node) {
        if (!zodImport) return;

        // Simple detection: z.object(...)
        if (node.callee.object?.name === 'z' && node.callee.property?.name === 'object') {
          context.report({
            node,
            message: 'Convert Zod schema to Valibot',
            fix(fixer: TSESLint.RuleFixer): TSESLint.RuleFix | null {
              // Replace 'z.object' with 'object'
              const replacements = [
                fixer.replaceText(node.callee, 'object'),
              ];

              // Recursively replace inner z.* calls (e.g., z.string() -> string())
              const arg = node.arguments[0]; // Assuming object literal arg
              if (arg?.type === 'ObjectExpression') {
                arg.properties.forEach(prop => {
                  if (prop.value?.callee?.object?.name === 'z') {
                    // e.g., z.string() -> string()
                    replacements.push(fixer.replaceText(prop.value.callee, prop.value.callee.property.name));
                  }
                });
              }

              // Add/fix imports (simplified; in reality, collect all needed validators)
              if (zodImport) {
                replacements.push(
                  fixer.replaceText(zodImport.source, "'valibot'"),
                  fixer.replaceText(zodImport.specifiers[0], '{ object, string }') // Adjust based on used validators
                );
              }

              return replacements;
            },
          });
        }
      },
    };
  },
};
```

To use it in a project's `.eslintrc.js`:

```javascript
module.exports = {
  plugins: ['valibot'],
  rules: {
    'valibot/zod-to-valibot': 'warn', // Or 'error'
  },
};
```

### Example Before/After Autofix

**Before (Zod):**

```typescript
import { z } from 'zod';

const userSchema = z.object({
  name: z.string(),
  age: z.number().min(18),
});
```

**After (Valibot, autofixed for basics):**

```typescript
import { object, string, number, minValue } from 'valibot';

const userSchema = object({
  name: string(),
  age: number([minValue(18)]),
});
```

For more advanced conversions (e.g., Joi's chaining or Arktype's string-based syntax), you'd need deeper AST analysis—perhaps integrating libraries like `babel-traverse` or `jscodeshift` for transforms. From TS types, start by generating a Zod schema via `ts-to-zod`, then convert from there.

If you share more details (e.g., a specific schema example or GitHub repo), I can refine this, test conversions with code execution, or even sketch rules for Joi/Arktype. What's your next step—implementation help, testing, or promotion on X?
