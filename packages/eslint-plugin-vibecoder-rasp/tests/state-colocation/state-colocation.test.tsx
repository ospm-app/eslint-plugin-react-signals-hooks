/** biome-ignore-all lint/suspicious/noArrayIndexKey: not relevant */
import {
  createContext,
  type JSX,
  type Dispatch,
  type SetStateAction,
  useContext,
  useMemo,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from 'react';

// Correct: State is colocated with its usage
export function CorrectCounter(): JSX.Element {
  const [count, setCount] = useState(0);

  const onClick = useCallback(() => {
    return setCount((c) => c + 1);
  }, []);

  return (
    <button type='button' onClick={onClick}>
      {count}
    </button>
  );
}

// Incorrect: State is defined outside the component
const [user, _setUser] = useState<{ id: string; name: string } | null>(null);

export function IncorrectUserProfile(): JSX.Element {
  return <div>{user?.name}</div>;
}

// Correct: State is used in a nested component in the same file
export function UserList(): JSX.Element {
  const [users, _setUsers] = useState<Array<{ id: string; name: string }>>([]);

  function UserItem({ user }: { user: { id: string; name: string } }) {
    return <li>{user.name}</li>;
  }

  return (
    <ul>
      {users.map((user) => (
        <UserItem key={user.id} user={user} />
      ))}
    </ul>
  );
}

// Incorrect: Prop drilling through multiple components
export function App(): JSX.Element {
  const [theme, _setTheme] = useState('light');
  return <Layout theme={theme} />;
}

function HeaderTheme({ theme }: { theme: string }): JSX.Element {
  return <div>Current theme: {theme}</div>;
}

function Layout({ theme }: { theme: string }): JSX.Element {
  return <HeaderTheme theme={theme} />;
}

// Correct: Using context for shared state
const ThemeContext = createContext<{ theme: string; setTheme: Dispatch<SetStateAction<string>> }>({
  theme: 'light',
  setTheme: () => {},
});

export function ThemedApp(): JSX.Element {
  const [theme, setTheme] = useState('light');

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      <Toolbar />
    </ThemeContext.Provider>
  );
}

function Toolbar(): JSX.Element {
  return <ThemedButton />;
}

function ThemedButton(): JSX.Element {
  const { theme } = useContext(ThemeContext);

  return (
    <button type='button' style={{ background: theme }}>
      Themed Button
    </button>
  );
}

// Incorrect: Using global state without context
let globalCounter = 0;

export function GlobalCounter(): JSX.Element {
  // This is bad - mutating global state during render
  globalCounter++;
  return <div>Count: {globalCounter}</div>;
}

// Correct: Derived state with useMemo
export function UserProfile({
  user,
}: {
  user: { firstName: string; lastName: string };
}): JSX.Element {
  const fullName = useMemo(
    () => `${user.firstName} ${user.lastName}`,
    [user.firstName, user.lastName]
  );

  return <div>{fullName}</div>;
}

// Incorrect: Complex logic in render
export function ComplexComponent({ items }: { items: Array<{ id: string }> }): JSX.Element {
  // This should be moved to a custom hook or useMemo
  const processedItems = items.map((item) => {
    return {
      ...item,
      processed: true,
      timestamp: Date.now(),
    };
  });

  return <List items={processedItems} />;
}

// Correct: Using custom hooks for complex logic
function useProcessedItems(items: Array<{ id: string }>) {
  return useMemo(() => {
    return items.map((item) => {
      return {
        ...item,
        processed: true,
        timestamp: Date.now(),
      };
    });
  }, [items]);
}

export function BetterComplexComponent({ items }: { items: Array<{ id: string }> }): JSX.Element {
  const processedItems = useProcessedItems(items);

  return <List items={processedItems} />;
}

// Utility component for demonstration
function List({ items }: { items: Array<{ id: string }> }) {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{JSON.stringify(item)}</li>
      ))}
    </ul>
  );
}

// Incorrect: State used too far from its declaration
export function DeeplyNestedComponent(): JSX.Element {
  const [count, setCount] = useState(0);

  function Grandchild(): JSX.Element {
    // This should trigger the rule - state used too far from its declaration
    return <div>Count: {count}</div>;
  }

  function Child(): JSX.Element {
    return <Grandchild />;
  }

  return (
    <div>
      <Child />
      <button type='button' onClick={() => setCount((c) => c + 1)}>
        Increment
      </button>
    </div>
  );
}

// Correct: State colocated with its usage
export function ProperlyColocatedState(): JSX.Element {
  return (
    <div>
      <Counter />
    </div>
  );
}

function Counter(): JSX.Element {
  const [count, setCount] = useState(0);

  return (
    <div>
      <div>Count: {count}</div>
      <button type='button' onClick={() => setCount((c) => c + 1)}>
        Increment
      </button>
    </div>
  );
}

// Incorrect: State passed through multiple components
export function PropDrillingState(): JSX.Element {
  const [user, setUser] = useState({ name: 'John' });

  return (
    <div>
      <Header user={user} />
      <button type='button' onClick={() => setUser({ name: 'Jane' })}>
        Change User
      </button>
    </div>
  );
}

function Header({ user }: { user: { name: string } }) {
  return (
    <header>
      <UserDisplay user={user} />
    </header>
  );
}

function UserDisplay({ user }: { user: { name: string } }) {
  // State is used here after being passed through multiple components
  return <div>Welcome, {user.name}!</div>;
}

function UserProfileNoProps(): JSX.Element | null {
  const userContext = useContext(UserContext);

  if (!userContext) {
    return null;
  }

  const { user, setUser } = userContext;

  return (
    <div>
      <div>Welcome, {user.name}!</div>

      <button type='button' onClick={() => setUser({ name: 'Jane' })}>
        Change User
      </button>
    </div>
  );
}

// Correct: Using Context API for state that needs to be deeply nested
export function ContextStateExample(): JSX.Element {
  return (
    <UserProvider>
      <UserProfileNoProps />
    </UserProvider>
  );
}

const UserContext = createContext<{
  user: { name: string };
  setUser: (user: { name: string }) => void;
} | null>(null);

function UserProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState({ name: 'John' });

  return <UserContext.Provider value={{ user, setUser }}>{children}</UserContext.Provider>;
}

// Incorrect: State used in a deeply nested hook
export function StateInDeeplyNestedHook(): JSX.Element {
  const [theme, setTheme] = useState('light');

  // This custom hook is too far from where the state is declared
  useThemeDependentEffect();

  return (
    <div>
      <button type='button' onClick={() => setTheme((t) => (t === 'light' ? 'dark' : 'light'))}>
        Toggle Theme
      </button>
    </div>
  );

  function useThemeDependentEffect(): void {
    // State used in a deeply nested hook
    useEffect(() => {
      document.body.className = theme;
    }, [theme]);
  }
}

// Correct: State and effect colocated
export function ProperlyColocatedHook(): JSX.Element {
  return (
    <div>
      <ThemeToggler />
    </div>
  );
}

function ThemeToggler(): JSX.Element {
  const [theme, setTheme] = useState('light');

  useEffect(() => {
    document.body.className = theme;
  }, [theme]);

  return (
    <button
      type='button'
      onClick={() => {
        return setTheme((t) => (t === 'light' ? 'dark' : 'light'));
      }}>
      Toggle Theme
    </button>
  );
}
