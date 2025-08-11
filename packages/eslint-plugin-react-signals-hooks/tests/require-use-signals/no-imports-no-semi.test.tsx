// No imports in this file; ensure fixer inserts import without a trailing semicolon
// Style: no semicolons

// simulate a signal-like object via naming convention to trigger detection without imports
const countSignal = { value: 0 } as any

export function NoImportsNoSemi() {
  // read from a signal-like identifier
  countSignal.value
  return null
}
