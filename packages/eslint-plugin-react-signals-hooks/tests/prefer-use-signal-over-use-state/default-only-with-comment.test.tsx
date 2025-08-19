import Signals from '@preact/signals-react' // keep-this-comment
import { useSignals } from '@preact/signals-react/runtime'
import { useState } from 'react'

export function DefaultOnlyWithComment() {
  useSignals()
  const [n, setN] = useState(0)
  setN(n + 1)
  return <div>{n}</div>
}
