import * as Signals from '@preact/signals-react';
import { useSignals } from '@preact/signals-react/runtime';
import { useState, type JSX } from 'react';

export function NamespaceImportCase(): JSX.Element {
  useSignals();
  const [count, setCount] = useState(0);
  setCount(count + 1);
  return <div>{count}</div>;
}
