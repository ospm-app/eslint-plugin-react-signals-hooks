import type { JSX } from 'react';
import type { Something } from 'somewhere';
import DefaultReact, { Fragment as F } from 'react';
import * as NS from '@preact/signals-react/runtime';
import { signal } from '@preact/signals-react';

// Expect: error for missing useSignals(); fixer should insert a separate value import without touching type-only/default/namespace
export function MixedImports(): JSX.Element {
  const s = signal(0);
  return <F>{s}</F>;
}
