import React from "react";
import type * as RTypes from "@preact/signals-react";
import SRDefault from '@preact/signals-react'; // default import (should be left untouched)
import * as SRNS from '@preact/signals-react'; // namespace import (type/value mixed)
import type { Signal as TSignal } from '@preact/signals-react'; // type-only named
import { jsx as _jsx } from "react/jsx-runtime"; // unrelated import

// Import from runtime in complex shapes that should NOT be modified directly:
import type { useSignals as TUseSignals } from '@preact/signals-react/runtime'; // type-only from runtime
import SRRunDefault from "@preact/signals-react/runtime"; // default from runtime
import * as SRRunNS from '@preact/signals-react/runtime'; // namespace from runtime

// Expectation: fixer inserts a separate value import for useSignals preserving file quote styles.

export function Demo() {
  const s: TSignal<number> = SRNS.signal(0);
  // trigger signal usage
  s.value++;
  return <div>{s}</div>;
}
