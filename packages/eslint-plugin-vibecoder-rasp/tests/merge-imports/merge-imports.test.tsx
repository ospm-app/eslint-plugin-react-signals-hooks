// oxlint-disable
/** biome-ignore-all lint/correctness/noUnusedImports: testing against */
/** biome-ignore-all lint/suspicious/noRedeclare: testing against */

// Incorrect, should be merged
import { useState } from 'react';
import type { JSX } from 'react';

// Correct
// import { useState, type JSX } from 'react';

// Incorrect usage - multiple imports from same source that should be merged
// @ts-expect-error
import { Button } from 'a';
// @ts-expect-error
import { Input } from 'a'; // This should be merged with the import above

// Correct
// import { Button, Input } from 'a';

// @ts-expect-error
// import { Button2 } from 'b';
import type { ButtonProps } from 'b';
// @ts-expect-error
import { Input2 } from 'b'; // This should be merged with the first import

// @ts-expect-error
import { Button3 } from 'c';

// Form Components
// @ts-expect-error
import { Input3 } from 'c'; // This should be merged with the import above

export const a = 'b';
