# Advanced ESLint Plugin Development

## Core Concepts

### 1. Rule Structure

```typescript
import { ESLintUtils } from '@typescript-eslint/utils';

const createRule = ESLintUtils.RuleCreator(
  name => `https://github.com/your-org/your-plugin/docs/rules/${name}`
);

const ruleName = 'rule-name';

export const rule = createRule({
  name: ruleName,
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce best practices',
      url: `https://github.com/your-org/your-plugin/docs/rules/${ruleName}`,
    },
    messages: {
      errorId: 'errorMessage',
      suggestFix: 'Use {{ alternative }} instead',
    },
    schema: [{
      type: 'object',
      properties: {
        allowList: { type: 'array', items: { type: 'string' } },
      },
    }],
    hasSuggestions: true,
  },
  defaultOptions: [{ allowList: [] }],
  create(context, [options]) {
    const sourceCode = context.sourceCode;
    const parserServices = ESLintUtils.getParserServices(context);
    
    return {
      'CallExpression[callee.name="signal"]'(node) {
        context.report({
          node,
          messageId: 'errorId',
          suggest: [{
            messageId: 'suggestFix',
            fix: fixer => fixer.replaceText(node, 'fixedCode()'),
          }],
        });
      },
    };
  },
});
```

## Best Practices

### 1. Performance

- **Selective Visiting**: Only visit relevant node types
- **Early Returns**: Exit early when possible
- **Caching**: Cache expensive operations

### 2. Type Checking

```typescript
const typeChecker = parserServices.program.getTypeChecker();
const tsNode = parserServices.esTreeNodeToTSNodeMap.get(node);
const type = typeChecker.getTypeAtLocation(tsNode);
```

### 3. Testing

```typescript
ruleTester.run('rule-name', rule, {
  valid: [
    { code: 'valid();', options: [{ allowList: ['valid'] }] },
  ],
  invalid: [
    {
      code: 'invalid();',
      errors: [{ messageId: 'errorId' }],
      output: 'fixed();',
    },
  ],
});
```

### 4. Documentation

```markdown
## `rule-name`

Description of the rule.

### ❌ Incorrect

```typescript
// Bad code
```

### ✅ Correct

```typescript
// Good code
```

### Options

- `option`: Description

## Resources

- [typescript-eslint](https://typescript-eslint.io/)
- [ESLint Guide](https://eslint.org/docs/developer-guide/)
- [AST Explorer](https://astexplorer.net/)
