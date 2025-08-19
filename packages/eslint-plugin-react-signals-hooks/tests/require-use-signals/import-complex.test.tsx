import { signal } from '@preact/signals-react';
import type { JSX } from 'react';

// existing imports from runtime with various forms we shouldn't touch
import type { Something } from '@preact/signals-react/runtime';
import RuntimeDefault from '@preact/signals-react/runtime';
import * as RuntimeNS from "@preact/signals-react/runtime";

// Expect: error for missing useSignals(); fixer should insert a separate value import
// without modifying type-only/default/namespace imports above
export function ComplexImports(): JSX.Element {
  const s = signal(0);
  return <div>{s}</div>;
}
