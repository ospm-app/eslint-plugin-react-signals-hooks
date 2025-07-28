/** biome-ignore-all lint/complexity/noUselessFragments: not relevant */
import React, { useState, useEffect, type ReactNode, type JSX } from 'react';

// ===== INCORRECT PATTERNS =====

// 1. Using React namespace for hooks
// This should trigger the rule
export function UsingReactNamespaceHooks(): JSX.Element {
  // Bad: Using React.useState
  const [count, _setCount] = React.useState(0);

  // Bad: Using React.useEffect
  React.useEffect(() => {
    document.title = `Count: ${count}`;
  }, [count]);

  return <div>Count: {count}</div>;
}

// 2. Using React namespace for types
// This should trigger the rule
export function UsingReactNamespaceTypes(): React.ReactNode {
  // Bad: Using React.ReactNode
  const content: React.ReactNode = 'Hello World';

  // Bad: Using React.JSX.Element
  const element: React.JSX.Element = <div>{content}</div>;

  return element;
}

// 3. Using React namespace for components
// This should trigger the rule
export function UsingReactNamespaceComponents(): JSX.Element {
  return (
    <div>
      {/* Bad: Using React.Fragment directly */}
      <React.Fragment>
        <span>Content inside</span>
      </React.Fragment>
    </div>
  );
}

// 4. Using React namespace for React.memo
// This should trigger the rule
export const MemoizedComponent = React.memo(function MemoizedComponent() {
  return <div>Memoized Component</div>;
});

// ===== CORRECT PATTERNS =====

// 1. Using direct imports for hooks
// This should pass the rule
export function UsingDirectImports(): JSX.Element {
  // Good: Using directly imported useState
  const [count, _setCount] = useState(0);

  // Good: Using directly imported useEffect
  useEffect(() => {
    document.title = `Count: ${count}`;
  }, [count]);

  return <div>Count: {count}</div>;
}

// 2. Using imported types
// This should pass the rule
export function UsingImportedTypes(): ReactNode {
  // Good: Using imported ReactNode
  const content: ReactNode = 'Hello World';

  // Good: Using imported JSX.Element
  const element: JSX.Element = <div>{content}</div>;

  return element;
}

// 3. Using Fragment shorthand
// This should pass the rule
export function UsingFragmentShorthand(): JSX.Element {
  return (
    <div>
      {/* Good: Using Fragment shorthand */}
      <>
        <span>Content inside</span>
      </>
    </div>
  );
}

// 4. Using directly imported memo
// This should pass the rule
import { memo } from 'react';

export const MemoizedWithDirectImport = memo(function MemoizedWithDirectImport() {
  return <div>Memoized with direct import</div>;
});

// 5. Using component with props and types
// This should pass the rule
interface UserProps {
  name: string;
  age: number;
  children: ReactNode;
}

export function UserProfile({ name, age, children }: UserProps): JSX.Element {
  return (
    <div>
      <h2>{name}</h2>
      <p>Age: {age}</p>
      <div>{children}</div>
    </div>
  );
}

// 6. Using context with proper imports
// This should pass the rule
import { createContext, useContext as useReactContext } from 'react';

const UserContext = createContext<{ name: string }>({ name: 'Guest' });

export function UserInfo(): JSX.Element {
  // Good: Using renamed import to avoid naming conflict
  const user = useReactContext(UserContext);

  return <div>Welcome, {user.name}!</div>;
}

// 7. Using forwardRef with proper imports
// This should pass the rule
import { forwardRef } from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
}

export const FancyButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ variant = 'primary', children, ...props }, ref) => {
    return (
      <button ref={ref} className={`btn ${variant}`} {...props}>
        {children}
      </button>
    );
  }
);

// 8. Using lazy and Suspense with proper imports
// This should pass the rule
import { lazy, Suspense } from 'react';

// @ts-expect-error
const LazyComponent = lazy(() => import('./SomeComponent'));

export function LazyLoadedComponent(): JSX.Element {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <LazyComponent />
    </Suspense>
  );
}
