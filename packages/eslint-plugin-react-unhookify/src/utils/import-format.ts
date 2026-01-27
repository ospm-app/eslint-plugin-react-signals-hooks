import { AST_NODE_TYPES, type TSESTree } from "@typescript-eslint/types";
import type { SourceCode } from "@typescript-eslint/utils/ts-eslint";

export type QuoteChar = '"' | "'";

export function getPreferredQuote(sourceCode: SourceCode): QuoteChar {
	const first = sourceCode.ast.body[0];

	if (
		typeof first !== "undefined" &&
		first.type === AST_NODE_TYPES.ImportDeclaration
	) {
		return sourceCode.getText(first.source).startsWith('"') ? '"' : "'";
	}

	return "'";
}

export function getPreferredSemicolon(sourceCode: SourceCode): boolean {
	const firstImport = sourceCode.ast.body.find(
		(n: TSESTree.ProgramStatement): n is TSESTree.ImportDeclaration => {
			return n.type === AST_NODE_TYPES.ImportDeclaration;
		},
	);

	if (typeof firstImport !== "undefined") {
		return sourceCode.getText(firstImport).trimEnd().endsWith(";");
	}

	const firstStmt = sourceCode.ast.body[0];

	if (typeof firstStmt !== "undefined") {
		const raw = sourceCode.getText(firstStmt).trimEnd();

		if (raw.length > 0) {
			return raw.endsWith(";");
		}
	}

	return true;
}

export function buildNamedImport(
	moduleName: string,
	names: Array<string>,
	quote: QuoteChar,
	semi: boolean,
): string {
	return `import { ${names.join(", ")} } from ${quote}${moduleName}${quote}${semi ? ";" : ""}\n`;
}
