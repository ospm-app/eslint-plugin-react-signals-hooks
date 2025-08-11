import { signal, computed } from '@preact/signals-react'
import type { JSX } from 'react'

// Expect: fixer should add correct store.f() even if finally contains other statements and unrelated .f() calls
export function WithExtraFinallyStatements(): JSX.Element {
  const s = signal(0)
  const c = computed(() => s.value + 1)
  // trigger usage
  s.value; c.value
  try {
    // body statements
    const x = 1; void x
  } finally {
    // existing different store variable and other statements
    const other = { f() {} } as any
    console.log('cleanup start')
    other.f()
  }
  return <div>{c}</div>
}
