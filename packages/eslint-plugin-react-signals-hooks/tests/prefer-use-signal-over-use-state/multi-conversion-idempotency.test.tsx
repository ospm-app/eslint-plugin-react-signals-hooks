import { useSignals } from '@preact/signals-react/runtime'
import { useState } from 'react'

export function MultiConversionIdempotency() {
  useSignals()
  const [a, setA] = useState(1)
  const [b, setB] = useState(2)
  setA(a + 1)
  setB(b + 1)
  return <div>{a}{b}</div>
}
