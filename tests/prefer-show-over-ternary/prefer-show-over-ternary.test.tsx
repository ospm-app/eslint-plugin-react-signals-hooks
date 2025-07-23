import { signal } from '@preact/signals-react';
// biome-ignore lint/correctness/noUnusedImports: false positive
import React, { type JSX } from 'react';
import { useSignals } from '@preact/signals-react/runtime';

// This component should trigger ESLint warnings for complex ternary with signals
export function TestComplexTernaryWithSignal(): JSX.Element {
  useSignals();

  const visibleSignal = signal(true);

  // This should trigger a warning - complex ternary with signal condition
  return (
    <div>
      {visibleSignal ? (
        <div>
          <h1>Title</h1>

          <p>Complex content that should use Show component</p>

          <button type='button'>Action</button>
        </div>
      ) : (
        <div>
          <h1>Alternative</h1>

          <p>Alternative complex content</p>
        </div>
      )}
    </div>
  );
}

// This component should trigger warning for ternary with signal and complex consequent
export function TestTernaryWithComplexConsequent(): JSX.Element {
  useSignals();

  const loadingSignal = signal(false);

  // This should trigger a warning - complex consequent with signal condition
  return (
    <div>
      {loadingSignal ? (
        <div className='loading-container'>
          <div className='spinner' />

          <p>Loading data...</p>

          <button type='button' onClick={() => {}}>
            Cancel
          </button>
        </div>
      ) : null}
    </div>
  );
}

// This component should trigger warning for ternary with signal and complex alternate
export function TestTernaryWithComplexAlternate(): JSX.Element {
  useSignals();

  const errorSignal = signal(false);

  // This should trigger a warning - complex alternate with signal condition
  return (
    <div>
      {errorSignal ? (
        <span>Error</span>
      ) : (
        <div className='success-container'>
          <h2>Success!</h2>

          <p>Operation completed successfully</p>

          <div className='actions'>
            <button type='button'>Continue</button>

            <button type='button'>Reset</button>
          </div>
        </div>
      )}
    </div>
  );
}

// This component should trigger warning for nested ternary with signals
export function TestNestedTernaryWithSignals(): JSX.Element {
  useSignals();

  const statusSignal = signal('loading');

  const dataSignal = signal<string | null>(null);

  // This should trigger a warning - nested ternary with signal conditions
  return (
    <div>
      {statusSignal.value === 'loading' ? (
        <div>Loading...</div>
      ) : statusSignal.value === 'error' ? (
        <div>
          <h3>Error occurred</h3>
          <p>Please try again later</p>
        </div>
      ) : (
        <div>
          <h3>Data loaded</h3>
          <p>{dataSignal}</p>
        </div>
      )}
    </div>
  );
}

// This component should trigger warning for ternary with logical expression and signal
export function TestTernaryWithLogicalSignal(): JSX.Element {
  useSignals();
  const userSignal = signal<{ isLoggedIn: boolean; name: string } | null>(null);

  // This should trigger a warning - logical expression with signal in ternary
  return (
    <div>
      {userSignal.value?.isLoggedIn ? (
        <div className='user-dashboard'>
          <h1>Welcome, {userSignal.value.name}!</h1>

          <nav>
            <a href='/profile'>Profile</a>

            <a href='/settings'>Settings</a>
          </nav>
        </div>
      ) : (
        <div className='login-form'>
          <h1>Please log in</h1>

          <form>
            <input type='text' placeholder='Username' />

            <input type='password' placeholder='Password' />

            <button type='submit'>Login</button>
          </form>
        </div>
      )}
    </div>
  );
}

// This component should NOT trigger warnings - simple ternary with signal
export function TestSimpleTernaryWithSignal(): JSX.Element {
  useSignals();
  const visibleSignal = signal(true);

  // This should NOT trigger a warning - simple ternary
  return <div>{visibleSignal ? <span>Visible</span> : <span>Hidden</span>}</div>;
}

// This component should NOT trigger warnings - ternary without signal condition
export function TestTernaryWithoutSignal(): JSX.Element {
  useSignals();
  const regularCondition = true;

  // This should NOT trigger a warning - no signal in condition
  return (
    <div>
      {regularCondition ? (
        <div>
          <h1>Complex content</h1>

          <p>But no signal in condition</p>

          <button type='button'>Action</button>
        </div>
      ) : (
        <div>Alternative</div>
      )}
    </div>
  );
}

// This component should NOT trigger warnings - direct signal usage (not .value)
export function TestTernaryWithDirectSignal(): JSX.Element {
  useSignals();

  const flagSignal = signal(true);

  // This should trigger a warning - direct signal usage in ternary condition
  return (
    <div>
      {flagSignal ? (
        <div className='active-state'>
          <h2>Active</h2>

          <p>System is currently active</p>

          <button type='button'>Deactivate</button>
        </div>
      ) : (
        <div className='inactive-state'>
          <h2>Inactive</h2>

          <p>System is currently inactive</p>

          <button type='button'>Activate</button>
        </div>
      )}
    </div>
  );
}

// This component should trigger warning with custom minComplexity
export function TestCustomComplexityTernary(): JSX.Element {
  useSignals();

  const modeSignal = signal('dark');

  // This should trigger a warning with minComplexity: 1
  return (
    <div>
      {modeSignal.value === 'dark' ? (
        <div className='dark-theme'>Dark mode</div>
      ) : (
        <div className='light-theme'>Light mode</div>
      )}
    </div>
  );
}

// Arrow function component with complex ternary - should trigger warning
export const TestArrowFunctionComplexTernary = (): JSX.Element => {
  useSignals();

  const stateSignal = signal('ready');

  // This should trigger a warning - complex ternary in arrow function
  return (
    <div>
      {stateSignal.value === 'ready' ? (
        <div className='ready-state'>
          <h2>System Ready</h2>

          <p>All systems are operational</p>

          <div className='controls'>
            <button type='button'>Start</button>

            <button type='button'>Configure</button>
          </div>
        </div>
      ) : (
        <div className='not-ready-state'>
          <h2>System Not Ready</h2>

          <p>Please wait while system initializes</p>
        </div>
      )}
    </div>
  );
};

// Component with ternary using unary expression with signal
export function TestUnaryExpressionTernary(): JSX.Element {
  useSignals();

  const enabledSignal = signal(false);

  // This should trigger a warning - unary expression with signal
  return (
    <div>
      {enabledSignal ? (
        <div className='enabled-container'>
          <h3>Feature Enabled</h3>

          <p>This feature is currently active</p>

          <button type='button'>Disable Feature</button>
        </div>
      ) : (
        <div className='disabled-container'>
          <h3>Feature Disabled</h3>

          <p>This feature is currently disabled</p>

          <button type='button'>Enable Feature</button>
        </div>
      )}
    </div>
  );
}
