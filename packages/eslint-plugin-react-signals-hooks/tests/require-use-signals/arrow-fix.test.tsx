import { signal } from '@preact/signals-react';
import type { JSX } from 'react';

// Expect: error for missing useSignals(); autofix wraps arrow body into block and inserts useSignals()
export const ArrowWithoutUseSignals = (): JSX.Element => <div>{signal(0)}</div>;
