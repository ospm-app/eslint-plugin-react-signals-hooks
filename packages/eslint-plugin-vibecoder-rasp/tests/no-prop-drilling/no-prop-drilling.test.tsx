import { type ReactNode, type JSX, useState, createContext, useContext } from 'react';

// Test component with prop drilling (3 levels deep - should pass with default config)
export function ComponentWithPropDrilling(): JSX.Element {
  const [count, setCount] = useState(0);

  return (
    <div>
      <h1>Counter App</h1>

      <DisplayCount count={count} />

      <IncrementButton onIncrement={() => setCount((c) => c + 1)} />
    </div>
  );
}

// Test component with excessive prop drilling (4 levels deep - should fail with default config)
export function ComponentWithDeepPropDrilling(): JSX.Element {
  const [user, _setUser] = useState({ name: 'John', age: 30 });

  return (
    <div>
      <h1>User Profile</h1>

      <UserProfile user={user} />
    </div>
  );
}

// Component with custom depth limit (configured to 5)
export function ComponentWithCustomDepthLimit(): JSX.Element {
  const [theme, setTheme] = useState('light');

  return (
    <div>
      <h1>Themed App</h1>

      <ThemeProvider theme={theme} setTheme={setTheme} />
    </div>
  );
}

// Component with context (should pass as it's not prop drilling)
export function ComponentWithContext(): JSX.Element {
  const [user, _setUser] = useState({ name: 'Alice', role: 'admin' });

  return (
    <UserContext.Provider value={user}>
      <UserDashboard />
    </UserContext.Provider>
  );
}

// Component with component composition (should pass)
export function ComponentWithComposition(): JSX.Element {
  return (
    <Page>
      <Header />

      <MainContent>
        <Article />
      </MainContent>
      <Footer />
    </Page>
  );
}

// Test configuration for custom depth limit
export const customDepthConfig = {
  rules: {
    'vibecoder-rasp/no-prop-drilling': [
      'error',
      { maxDepth: 5 }, // Allow deeper prop drilling
    ],
  },
};

// Test configuration to ignore specific props
export const ignorePropsConfig = {
  rules: {
    'vibecoder-rasp/no-prop-drilling': [
      'error',
      {
        maxDepth: 3,
        ignoreProps: ['theme', 'onClick'],
      },
    ],
  },
};

// Mock components for testing
function DisplayCount({ count }: { count: number }): JSX.Element {
  return <div>Count: {count}</div>;
}

function IncrementButton({ onIncrement }: { onIncrement: () => void }): JSX.Element {
  return (
    <button type='button' onClick={onIncrement}>
      Increment
    </button>
  );
}

function UserProfile({ user }: { user: { name: string; age: number } }): JSX.Element {
  return (
    <div>
      <UserDetails user={user} />
    </div>
  );
}

function UserDetails({ user }: { user: { name: string; age: number } }): JSX.Element {
  return (
    <div>
      <UserInfo user={user} />
    </div>
  );
}

function UserInfo({ user }: { user: { name: string; age: number } }): JSX.Element {
  return (
    <div>
      <UserCard user={user} />
    </div>
  );
}

function UserCard({ user }: { user: { name: string; age: number } }): JSX.Element {
  return (
    <div>
      <p>Name: {user.name}</p>
      <p>Age: {user.age}</p>
    </div>
  );
}

function ThemeProvider({
  theme,
  setTheme,
}: {
  theme: string;
  setTheme: (theme: string) => void;
}): JSX.Element {
  return (
    <div>
      <ThemeButton theme={theme} setTheme={setTheme} />
    </div>
  );
}

function ThemeButton({
  theme,
  setTheme,
}: {
  theme: string;
  setTheme: (theme: string) => void;
}): JSX.Element {
  // This would normally be several levels deeper
  return (
    <button type='button' onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
      Toggle Theme
    </button>
  );
}

const UserContext = createContext<{ name: string; role: string } | null>(null);

function UserDashboard(): JSX.Element {
  const user = useContext(UserContext);

  return (
    <div>
      <h2>Welcome, {user?.name}!</h2>

      <UserRole role={user?.role || ''} />
    </div>
  );
}

function UserRole({ role }: { role: string }): JSX.Element {
  return <p>Role: {role}</p>;
}

// Composition components
function Page({ children }: { children: ReactNode }): JSX.Element {
  return <div className='page'>{children}</div>;
}

function Header(): JSX.Element {
  return <header>Header</header>;
}

function MainContent({ children }: { children: ReactNode }): JSX.Element {
  return <main>{children}</main>;
}

function Article(): JSX.Element {
  return <article>Article Content</article>;
}

function Footer(): JSX.Element {
  return <footer>Footer</footer>;
}

// Test component with ignored props
export function ComponentWithIgnoredProps(): JSX.Element {
  const [theme, setTheme] = useState('light');
  const [count, _setCount] = useState(0);

  return (
    <div>
      <ThemedComponent theme={theme} onClick={() => setTheme('dark')} count={count} />
    </div>
  );
}

function ThemedComponent({
  theme,
  onClick,
  count,
}: {
  theme: string;
  onClick: () => void;
  count: number;
}): JSX.Element {
  // theme and onClick are ignored in the config, so they can be drilled deeper
  return (
    <div className={theme}>
      <button type='button' onClick={onClick}>
        Toggle Theme (Count: {count})
      </button>
    </div>
  );
}
