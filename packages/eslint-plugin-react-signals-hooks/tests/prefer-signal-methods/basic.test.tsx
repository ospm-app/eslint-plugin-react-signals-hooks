import { signal } from '@preact/signals-react';

// Expect: warn to use .peek() when reading without tracking
export function NonReactiveRead() {
  const sSignal = signal(0);
  console.info(sSignal.value);
}
