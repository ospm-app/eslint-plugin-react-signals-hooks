/**
 * Helper function to generate documentation URLs for rules
 * @param ruleName - The name of the rule (without .md extension)
 * @returns The full URL to the rule's documentation
 */
export function getRuleDocUrl(ruleName: string): string {
  return `https://github.com/ospm-app/eslint-plugin-react-signals-hooks/tree/main/packages/eslint-plugin-react-signals-hooks/docs/rules/${ruleName}.md`;
}
