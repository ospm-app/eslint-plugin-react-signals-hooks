export function escapeRegExp(literal: string): string {
  // eslint-disable-next-line optimize-regex/optimize-regex
  return literal.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export function buildSuffixRegex(suffix: string | undefined): RegExp {
  const s = typeof suffix === 'string' && suffix.length > 0 ? suffix : 'Signal';
  // eslint-disable-next-line security/detect-non-literal-regexp
  return new RegExp(`${escapeRegExp(s)}$`);
}

export function hasSignalSuffix(name: string, suffixRegex: RegExp): boolean {
  return suffixRegex.test(name);
}
