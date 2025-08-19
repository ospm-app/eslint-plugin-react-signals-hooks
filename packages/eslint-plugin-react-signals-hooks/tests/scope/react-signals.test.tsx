import { signal } from '@preact/signals-react';
import { useEffect } from 'react';

// Expect: rules DO trigger here (plugin scope applies)
export function ReactSignalsScope() {
  const countSignal = signal(0);
  useEffect(() => {
    console.info(countSignal.value);
  }, [countSignal.value]);
  return null;
}
