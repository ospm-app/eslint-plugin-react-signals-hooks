import { AST_NODE_TYPES, type TSESTree } from '@typescript-eslint/types';
import type { TSESLint } from '@typescript-eslint/utils';
import type { SourceCode } from '@typescript-eslint/utils/ts-eslint';

import { buildNamedImport, getPreferredQuote, getPreferredSemicolon } from './import-format.js';

/**
 * Ensure that a given named import exists for `moduleName`.
 * Returns a list of fixes to add/merge the named import in the most idiomatic way.
 *
 * Behavior:
 * - If an import from module exists with a namespace specifier, inserts a separate named import line.
 * - If it has named specifiers, appends to that list.
 * - If it only has a default specifier, converts to `default, { named }` form.
 * - If none exists, inserts a new import near the first import, respecting quote and semicolon style.
 */
export function ensureNamedImportFixes(
  context: { sourceCode: SourceCode },
  fixer: TSESLint.RuleFixer,
  moduleName: string,
  importName: string
): Array<TSESLint.RuleFix> {
  const fixes: Array<TSESLint.RuleFix> = [];
  const { sourceCode } = context;

  const importDeclarations = sourceCode.ast.body.filter(
    (n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration =>
      n.type === AST_NODE_TYPES.ImportDeclaration
  );

  const existing = importDeclarations.find((d) => d.source.value === moduleName);

  // If already imported as named, do nothing
  if (existing) {
    const hasNamedAlready = existing.specifiers.some(
      (s: TSESTree.ImportClause): s is TSESTree.ImportSpecifier =>
        s.type === AST_NODE_TYPES.ImportSpecifier &&
        s.imported.type === AST_NODE_TYPES.Identifier &&
        s.imported.name === importName
    );

    if (hasNamedAlready) {
      return fixes;
    }

    const hasNamespace = existing.specifiers.some(
      (s: TSESTree.ImportClause): s is TSESTree.ImportNamespaceSpecifier =>
        s.type === AST_NODE_TYPES.ImportNamespaceSpecifier
    );

    if (hasNamespace) {
      // Safer to add a separate named import line
      const quote = getPreferredQuote(sourceCode);
      const semi = getPreferredSemicolon(sourceCode);
      const text = buildNamedImport(moduleName, [importName], quote, semi);
      fixes.push(fixer.insertTextAfter(existing, `\n${text}`));
      return fixes;
    }

    // Try to merge with existing specifiers
    const lastNamed = [...existing.specifiers]
      .reverse()
      .find(
        (s: TSESTree.ImportClause): s is TSESTree.ImportSpecifier =>
          s.type === AST_NODE_TYPES.ImportSpecifier
      );

    const defaultSpec = existing.specifiers.find(
      (s: TSESTree.ImportClause): s is TSESTree.ImportDefaultSpecifier =>
        s.type === AST_NODE_TYPES.ImportDefaultSpecifier
    );

    if (lastNamed) {
      fixes.push(fixer.insertTextAfter(lastNamed, `, ${importName}`));
      return fixes;
    }

    if (defaultSpec) {
      // Replace entire import to include named list
      const quote = getPreferredQuote(sourceCode);
      const semi = getPreferredSemicolon(sourceCode);
      const newText = `import ${defaultSpec.local.name}, { ${importName} } from ${quote}${moduleName}${quote}${semi ? ';' : ''}`;
      fixes.push(fixer.replaceText(existing, newText));
      return fixes;
    }

    // No default, no named, no namespace -> empty? Insert a fresh named import before it
    const quote = getPreferredQuote(sourceCode);
    const semi = getPreferredSemicolon(sourceCode);
    const text = buildNamedImport(moduleName, [importName], quote, semi);
    fixes.push(fixer.insertTextBefore(existing, text));
    return fixes;
  }

  // No import from module found -> insert near first import or at top
  const firstImport = importDeclarations[0];
  const quote = getPreferredQuote(sourceCode);
  const semi = getPreferredSemicolon(sourceCode);
  const text = buildNamedImport(moduleName, [importName], quote, semi);

  if (firstImport) {
    fixes.push(fixer.insertTextBefore(firstImport, text));
  } else {
    fixes.push(fixer.insertTextAfterRange([0, 0], text));
  }

  return fixes;
}
