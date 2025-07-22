// test-signals.ts - Simulating a module with exported signals
import { signal } from "@preact/signals-react";
export const counterSignal = signal(0);
export const nameSignal = signal("test");
