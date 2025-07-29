import { useState, useEffect, useRef, type JSX } from 'react';

// Bad: Missing cleanup for event listener
// This should trigger the rule
export function MissingCleanup(): JSX.Element {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    // Bad: No cleanup for the event listener
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Missing: return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  return (
    <div>
      Mouse position: {position.x}, {position.y}
    </div>
  );
}

// Good: Proper cleanup for event listener
// This should pass the rule
export function WithCleanup(): JSX.Element {
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX, y: e.clientY });
    };

    window.addEventListener('mousemove', handleMouseMove);

    // Good: Cleanup function to remove the event listener
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div>
      Mouse position: {position.x}, {position.y}
    </div>
  );
}

// Bad: Missing cleanup for timeout
// This should trigger the rule
export function MissingTimeoutCleanup(): JSX.Element {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Bad: No cleanup for the timeout
    const _timer = globalThis.setTimeout(() => {
      setCount((prev) => prev + 1);
    }, 1000);

    // Missing: return () => clearTimeout(timer);
  }, [count]);

  return <div>Count: {count}</div>;
}

// Good: Proper cleanup for timeout
// This should pass the rule
export function WithTimeoutCleanup(): JSX.Element {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const timer = globalThis.setTimeout(() => {
      setCount((prev) => prev + 1);
    }, 1000);

    // Good: Cleanup function to clear the timeout
    return () => {
      globalThis.clearTimeout(timer);
    };
  }, [count]);

  return <div>Count: {count}</div>;
}

// Bad: Missing cleanup for interval
// This should trigger the rule
export function MissingIntervalCleanup(): JSX.Element {
  const [count, setCount] = useState(0);

  useEffect(() => {
    // Bad: No cleanup for the interval
    const _interval = globalThis.setInterval(() => {
      setCount((prev) => prev + 1);
    }, 1000);

    // Missing: return () => globalThis.clearInterval(interval);
  }, []);

  return <div>Count: {count}</div>;
}

// Good: Proper cleanup for interval
// This should pass the rule
export function WithIntervalCleanup(): JSX.Element {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const interval = globalThis.setInterval(() => {
      setCount((prev) => prev + 1);
    }, 1000);

    // Good: Cleanup function to clear the interval
    return () => {
      globalThis.clearInterval(interval);
    };
  }, []);

  return <div>Count: {count}</div>;
}

// Component with subscription that needs cleanup
export function SubscriptionComponent(): JSX.Element {
  const [data, setData] = useState<{ timestamp: number } | null>(null);

  const subscriptionRef = useRef<{ unsubscribe: () => void } | null>(null);

  useEffect(() => {
    // Simulate a subscription
    const subscription = {
      unsubscribe: () => {
        console.info('Unsubscribed');
      },
    };
    subscriptionRef.current = subscription;

    // Simulate data updates
    const interval = globalThis.setInterval(() => {
      setData({ timestamp: Date.now() });
    }, 1000);

    // Good: Cleanup both subscription and interval
    return () => {
      if (subscriptionRef.current) {
        subscriptionRef.current.unsubscribe();
      }

      globalThis.clearInterval(interval);
    };
  }, []);

  return <div>Data: {data ? JSON.stringify(data) : 'Loading...'}</div>;
}

// Component with multiple effects and cleanups
export function MultipleEffects(): JSX.Element {
  const [online, setOnline] = useState(navigator.onLine);

  const [windowSize, setWindowSize] = useState({
    width: window.innerWidth,
    height: window.innerHeight,
  });

  // Effect for online/offline status
  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Effect for window resize
  useEffect(() => {
    const handleResize = () => {
      setWindowSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return (
    <div>
      <div>Status: {online ? 'Online' : 'Offline'}</div>
      <div>
        Window size: {windowSize.width}x{windowSize.height}
      </div>
    </div>
  );
}

// Test configuration for custom options
export const customOptionsConfig = {
  rules: {
    'vibecoder-rasp/require-cleanup': [
      'error',
      {
        // Ignore certain effect dependencies
        ignoreDependencies: ['dispatch', 'stableCallback'],
        // Allow certain patterns without cleanup
        allowWithoutCleanup: ['console.log', 'analytics.track'],
        // Custom cleanup function names to detect
        cleanupFunctionNames: ['unsubscribe', 'cleanup', 'destroy', 'dispose'],
      },
    ],
  },
};

// Component with allowed patterns that don't need cleanup
export function AllowedPatterns(): JSX.Element {
  useEffect(() => {
    // These are allowed by the custom config
    console.info('Component mounted');
    // analytics.track('page_view');

    // This would normally need cleanup but is allowed by the config
    const timer = globalThis.setTimeout(() => {
      console.info('Delayed log');
    }, 1000);

    return () => {
      globalThis.clearTimeout(timer);
    };
  }, []);

  return <div>Check console for logs</div>;
}

// Component with custom cleanup function
export function CustomCleanup(): JSX.Element {
  useEffect(() => {
    // Custom cleanup pattern
    const subscription = {
      subscribe: () => {
        console.info('Subscribed');
      },
      destroy: () => {
        console.info('Destroyed');
      }, // Matches cleanupFunctionNames
    };

    subscription.subscribe();

    // The rule will detect the 'destroy' method as a cleanup function
    return () => subscription.destroy();
  }, []);

  return <div>Subscription component</div>;
}
