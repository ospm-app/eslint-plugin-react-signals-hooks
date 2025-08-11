import Signals from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { useState } from 'react';

export function DefaultOnlyImportCase() {
  useSignals()
  const [v, setV] = useState(1)
  setV(v + 1)
  return <span>{v}</span>
}
