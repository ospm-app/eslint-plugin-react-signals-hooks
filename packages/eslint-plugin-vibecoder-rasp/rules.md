# ESLint Rules for React TypeScript Projects

## State Management

### Single Source of Truth

#### `state-colocation`

Enforces that component state is placed as close as possible to where it's used, improving code organization and maintainability.

**Incorrect** ❌:

```tsx
// ParentComponent.tsx
const Parent = () => {
  const [user, setUser] = useState(null);
  
  return (
    <div>
      <ChildA user={user} />
      <ChildB user={user} />
    </div>
  );
};
```

**Correct** ✅:

```tsx
// UserContext.tsx
const UserContext = createContext(null);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  return (
    <UserContext.Provider value={{ user, setUser }}>
      {children}
    </UserContext.Provider>
  );
};
```

#### `no-prop-drilling`

Prevents prop drilling beyond a configurable depth to maintain code maintainability.

**Incorrect** ❌:

```tsx
<Parent>
  <ChildA>
    <ChildB>
      <ChildC>
        <ChildD data={data} />  // Prop drilled through 4 components
      </ChildC>
    </ChildB>
  </ChildA>
</Parent>
```

**Correct** ✅:

```tsx
// Use context or state management for deep nesting
<DataProvider>
  <Parent>
    <ChildA>
      <ChildB>
        <ChildC>
          <ChildD />  // Uses context or state management
        </ChildC>
      </ChildB>
    </ChildA>
  </Parent>
</DataProvider>
```

#### `derived-state-memo`

Requires derived state to be memoized using `useMemo` or `computed` to prevent unnecessary recalculations.

**Incorrect** ❌:

```tsx
const Component = ({ items }) => {
  const total = items.reduce((sum, item) => sum + item.value, 0);
  // Recalculates on every render
  return <div>Total: {total}</div>;
};
```

**Correct** ✅:

```tsx
const Component = ({ items }) => {
  const total = useMemo(
    () => items.reduce((sum, item) => sum + item.value, 0),
    [items]  // Only recalculates when items change
  );
  return <div>Total: {total}</div>;
};
```

#### `no-state-mutation`

Prevents direct state mutations, enforcing the use of proper state update functions.

**Incorrect** ❌:

```tsx
const [user, setUser] = useState({ name: 'John' });
user.name = 'Jane';  // Direct mutation!
```

**Correct** ✅:

```tsx
const [user, setUser] = useState({ name: 'John' });
setUser(prev => ({ ...prev, name: 'Jane' }));  // Proper update
```

#### `state-initialization`

Ensures proper initialization of component state with appropriate default values, preventing `undefined` state issues.

**Incorrect** ❌:

```tsx
// Missing type annotation and default values
const [user, setUser] = useState();
// Later...
return <div>{user.name}</div>;  // Potential runtime error
```

**Correct** ✅:

```tsx
// With explicit type and default values
interface User {
  name: string;
  email: string;
}

const [user, setUser] = useState<User>({ 
  name: '', 
  email: '' 
});

// Or with a function for expensive initial state
const [data, setData] = useState(() => 
  fetchInitialData()
);

// For optional state that might be undefined
const [profile, setProfile] = useState<User | undefined>();
```

**Configuration Options**:

- `requireInitialValue`: When `true`, enforces that all state variables must have an initial value (default: `false`)
- `allowUndefined`: When `false`, prevents explicitly setting `undefined` as a type in the state (default: `true`)

## Component Composition

### Component Interface

#### `explicit-prop-types`

Enforces explicit prop types for all components, improving code readability and catching potential bugs.

**Incorrect** ❌:

```tsx
// Missing prop types
function Button({ children, onClick, type }) {
  return (
    <button type={type} onClick={onClick}>
      {children}
    </button>
  );
}
```

**Correct** ✅:

```tsx
// With TypeScript interface
interface ButtonProps {
  children: React.ReactNode;
  onClick: () => void;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
}

function Button({ 
  children, 
  onClick, 
  type = 'button',
  variant = 'primary',
  disabled = false 
}: ButtonProps) {
  return (
    <button 
      type={type} 
      onClick={onClick}
      className={`btn btn-${variant}`}
      disabled={disabled}
    >
      {children}
    </button>
  );
}
```

**Configuration Options**:

- `requireTypeAnnotation`: When `true`, requires TypeScript types for all props (default: `true`)
- `allowInlineTypes`: When `false`, requires prop types to be defined in an interface/type (default: `true`)

#### `prop-default-values`

Requires default values for optional props to ensure predictable component behavior.

**Incorrect** ❌:

```tsx
interface UserProfileProps {
  name: string;
  avatarUrl?: string;  // Optional but no default
  isAdmin?: boolean;   // Optional but no default
}

function UserProfile({ name, avatarUrl, isAdmin }: UserProfileProps) {
  return (
    <div>
      <img src={avatarUrl} alt={name} />  // ❌ Could be undefined
      <h2>{name} {isAdmin && '(Admin)'}</h2>
    </div>
  );
}
```

**Correct** ✅:

```tsx
interface UserProfileProps {
  name: string;
  avatarUrl?: string;
  isAdmin?: boolean;
}

function UserProfile({ 
  name, 
  avatarUrl = '/default-avatar.png',
  isAdmin = false 
}: UserProfileProps) {
  return (
    <div>
      <img src={avatarUrl} alt={name} />
      <h2>{name} {isAdmin && '(Admin)'}</h2>
    </div>
  );
}

// Or with defaultProps for class components
class UserProfile extends React.Component<UserProfileProps> {
  static defaultProps = {
    avatarUrl: '/default-avatar.png',
    isAdmin: false
  };
  
  render() {
    const { name, avatarUrl, isAdmin } = this.props;
    return (
      <div>
        <img src={avatarUrl} alt={name} />
        <h2>{name} {isAdmin && '(Admin)'}</h2>
      </div>
    );
  }
}
```

**Configuration Options**:

- `requireDefaultsForOptionalProps`: When `true`, requires default values for all optional props (default: `true`)
- `allowUndefinedAsDefault`: When `false`, prevents using `undefined` as a default value (default: `true`)

#### `prop-destructuring`

Enforces prop destructuring in function parameters for better readability and consistency.

**Incorrect** ❌:

```tsx
function UserCard(props) {
  return (
    <div className="card">
      <h2>{props.user.name}</h2>
      <p>Email: {props.user.email}</p>
      {props.showDetails && <UserDetails details={props.user.details} />}
    </div>
  );
}
```

**Correct** ✅:

```tsx
interface UserCardProps {
  user: {
    name: string;
    email: string;
    details?: UserDetails;
  };
  showDetails?: boolean;
}

function UserCard({ user, showDetails = false }: UserCardProps) {
  const { name, email, details } = user;
  
  return (
    <div className="card">
      <h2>{name}</h2>
      <p>Email: {email}</p>
      {showDetails && details && <UserDetails details={details} />}
    </div>
  );
}
```

**Configuration Options**:

- `requireNestedDestructuring`: When `true`, enforces destructuring of nested object properties (default: `false`)
- `maxDepth`: Maximum depth for nested destructuring (default: `3`)

#### `no-prop-spreading`

Prevents prop spreading in components to ensure all props are explicitly defined.

**Incorrect** ❌:

```tsx
function UserProfile(props) {
  return <ProfileCard {...props} />;  // ❌ Unclear what props are being passed
}
```

**Correct** ✅:

```tsx
interface UserProfileProps {
  name: string;
  email: string;
  avatarUrl?: string;
  onUpdate: (data: UserData) => void;
}

function UserProfile({ name, email, avatarUrl, onUpdate }: UserProfileProps) {
  return (
    <ProfileCard 
      name={name}
      email={email}
      avatarUrl={avatarUrl}
      onUpdate={onUpdate}
    />
  );
}
```

**Allowed Exceptions**:

- HOC (Higher-Order Components) that need to pass through props
- Library components that are specifically designed to spread props

**Configuration Options**:

- `ignoreHOCs`: When `true`, allows prop spreading in HOCs (default: `true`)
- `allowedComponents`: Array of component names that are allowed to use prop spreading (default: `[]`)

#### `prop-ordering`

Enforces consistent prop ordering in JSX for better readability and code reviews.

**Incorrect** ❌:

```tsx
<Button
  variant="primary"
  onClick={handleClick}
  disabled={isLoading}
  type="submit"
  className="mt-4"
  id="submit-button"
>
  {isLoading ? 'Saving...' : 'Save'}
</Button>
```

**Correct** ✅:

```tsx
<Button
  // 1. HTML/React built-in props
  id="submit-button"
  type="submit"
  className="mt-4"
  
  // 2. Event handlers
  onClick={handleClick}
  
  // 3. Component-specific props
  variant="primary"
  disabled={isLoading}
  
  // 4. Children (when on same line)
>
  {isLoading ? 'Saving...' : 'Save'}
</Button>
```

**Default Order**:

1. Required props (alphabetical)
2. Optional props (alphabetical)
3. Event handlers (on*, handle*)
4. Aria-* props
5. data-* props
6. className
7. style
8. key
9. ref
10. children

**Configuration Options**:

- `groups`: Array of regex patterns to define custom prop groups
- `requiredFirst`: When `true`, places required props before optional ones (default: `true`)
- `alphabetical`: When `true`, sorts props alphabetically within groups (default: `true`)

## Effects and Side Effects

### Effect Cleanup

#### `require-cleanup`

Ensures that all effects that set up event listeners, timeouts, or subscriptions properly clean them up, preventing memory leaks.

**Incorrect** ❌:

```tsx
useEffect(() => {
  const handleResize = () => console.log('resized');
  window.addEventListener('resize', handleResize);
  // Missing cleanup!
}, []);
```

**Correct** ✅:

```tsx
useEffect(() => {
  const handleResize = () => console.log('resized');
  window.addEventListener('resize', handleResize);
  
  // Proper cleanup
  return () => {
    window.removeEventListener('resize', handleResize);
  };
}, []);
```

#### `proper-dependency-arrays`

Enforces best practices for dependency arrays in React hooks, ensuring all dependencies are properly declared and stable.

**Incorrect** ❌:

```tsx
const [count, setCount] = useState(0);

// Missing dependency: count
useEffect(() => {
  const timer = setInterval(() => {
    setCount(count + 1);
  }, 1000);
  
  return () => clearInterval(timer);
}, []);

// Unstable dependency: new object created on each render
const user = { id: 1 };
useEffect(() => {
  fetchUser(user.id);
}, [user]); // ❌ new object on every render
```

**Correct** ✅:

```tsx
// Option 1: Include all dependencies
const [count, setCount] = useState(0);

useEffect(() => {
  const timer = setInterval(() => {
    setCount(prevCount => prevCount + 1); // Using functional update
  }, 1000);
  
  return () => clearInterval(timer);
}, []); // No dependencies needed with functional update

// Option 2: For stable dependencies
const user = useMemo(() => ({ id: 1 }), []); // Stable reference
useEffect(() => {
  fetchUser(user.id);
}, [user]); // ✅ Stable dependency

// Option 3: Move dependencies outside the effect
const userId = 1;
useEffect(() => {
  fetchUser(userId);
}, [userId]); // ✅ Primitive value is stable
```

**Configuration Options**:

- `checkAllHooks`: When `true`, checks all React hooks with dependency arrays (default: `true`)
- `allowEmptyDeps`: When `false`, warns about empty dependency arrays (default: `true`)
- `ignoreStableDeps`: When `true`, skips checks for stable dependencies (default: `false`)

#### `stable-dependencies`

Ensures that all dependencies in React hooks are stable references to prevent unnecessary effect re-runs.

**Incorrect** ❌:

```tsx
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  
  // New object created on each render
  const fetchConfig = {
    headers: { 'Authorization': 'Bearer token' }
  };
  
  // Inline function in effect
  useEffect(() => {
    const fetchData = async () => {
      const response = await fetch(`/api/users/${userId}`, fetchConfig);
      setUser(await response.json());
    };
    
    fetchData();
  }, [userId, fetchConfig]); // ❌ fetchConfig changes on every render
  
  return <div>{user?.name}</div>;
}
```

**Correct** ✅:

```tsx
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  
  // Memoize the config object
  const fetchConfig = useMemo(() => ({
    headers: { 'Authorization': 'Bearer token' }
  }), []); // ✅ Stable reference
  
  // Memoize the fetch function
  const fetchData = useCallback(async () => {
    const response = await fetch(`/api/users/${userId}`, fetchConfig);
    setUser(await response.json());
  }, [userId, fetchConfig]);
  
  // Use the memoized function
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  return <div>{user?.name}</div>;
}
```

**Configuration Options**:

- `checkFunctionDeps`: When `true`, checks for stable function references (default: `true`)
- `checkObjectDeps`: When `true`, checks for stable object/array references (default: `true`)
- `allowedUnstableDeps`: Array of dependency names that are allowed to be unstable (default: `[]`)

```

**Correct** ✅:

```tsx
const [count, setCount] = useState(0);

// Option 1: Include all dependencies
useEffect(() => {
  const timer = setInterval(() => {
    setCount(c => c + 1); // Using functional update
  }, 1000);
  
  return () => clearInterval(timer);
}, []); // No dependencies needed with functional update

// Option 2: Use useCallback for complex dependencies
const fetchData = useCallback(async () => {
  const result = await api.fetchData(count);
  // ...
}, [count]); // All dependencies properly declared
```

#### `missing-dependencies`

Prevents missing dependencies in effect hooks that could lead to stale closures.

**Incorrect** ❌:

```tsx
const [user, setUser] = useState(null);
const fetchUser = async (id) => {
  const data = await getUser(id);
  setUser(data);
};

useEffect(() => {
  fetchUser(1);
}, []); // fetchUser is used but not in deps
```

**Correct** ✅:

```tsx
const [user, setUser] = useState(null);

// Option 1: Move function inside effect
useEffect(() => {
  const fetchUser = async (id) => {
    const data = await getUser(id);
    setUser(data);
  };
  
  fetchUser(1);
}, []); // No external dependencies

// Option 2: Wrap with useCallback
const fetchUser = useCallback(async (id) => {
  const data = await getUser(id);
  setUser(data);
}, []); // No dependencies here

useEffect(() => {
  fetchUser(1);
}, [fetchUser]); // Now properly included
```

#### `stable-dependencies`

Ensures that values used in dependency arrays have stable references.

**Incorrect** ❌:

```tsx
const options = { enable: true };

useEffect(() => {
  // Effect logic
}, [options]); // New object on every render
```

**Correct** ✅:

```tsx
// Option 1: Memoize the object
const options = useMemo(() => ({
  enable: true
}), []); // Stable reference

// Option 2: Move inline
useEffect(() => {
  const options = { enable: true };
  // Effect logic
}, []); // No dependency needed

// Option 3: Use primitive values
const enable = true;
useEffect(() => {
  const options = { enable };
  // Effect logic
}, [enable]); // Primitive value is stable
```

## Component Composition

### Props Interface

#### `explicit-prop-types`

Ensures all React components have explicit prop type definitions, improving code maintainability and developer experience.

**Incorrect** ❌:

```tsx
// No prop types defined
const UserProfile = ({ name, age }) => (
  <div>{name}, {age} years old</div>
);
```

**Incorrect** ❌:

```tsx
// Don't use React.FC
const UserProfile: React.FC<UserProfileProps> = ({ name, age, isAdmin = false }) => (
  <div>{name}, {age} years old{isAdmin && ' (Admin)'}</div>
);
```

**Correct** ✅:

```tsx
// With TypeScript
type UserProfileProps = {
  name: string;
  age: number;
  isAdmin?: boolean;  // Optional prop
};

function UserProfile({ name, age, isAdmin = false }: UserProfileProps) {
  return (
    <div>{name}, {age} years old{isAdmin && ' (Admin)'}</div>
  );
}
```

#### `require-default-props`

Ensures that all optional props have default values defined, making component behavior more predictable.

**Incorrect** ❌:

```tsx
type ButtonProps = {
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
};

const Button = ({ variant, size, onClick }) => (
  <button className={`btn-${variant} ${size}`} onClick={onClick}>
    Click me
  </button>
);
```

**Correct** ✅:

```tsx
// With TypeScript
type ButtonProps = {
  variant?: 'primary' | 'secondary';
  size?: 'small' | 'medium' | 'large';
  onClick: () => void;
};

const Button = ({ 
  variant = 'primary', 
  size = 'medium', 
  onClick 
}: ButtonProps) => (
  <button className={`btn-${variant} ${size}`} onClick={onClick}>
    Click me
  </button>
);

// With defaultProps
Button.defaultProps = {
  variant: 'primary',
  size: 'medium'
};
```

#### `enforce-prop-destructuring`

Requires that all component props are destructured in the function parameters.

**Incorrect** ❌:

```tsx
const UserCard = (props) => {
  return (
    <div className="user-card">
      <h2>{props.user.name}</h2>
      <p>Email: {props.user.email}</p>
    </div>
  );
};
```

**Correct** ✅:

```tsx
// Destructure props in parameters
const UserCard = ({ user, onSelect, isSelected = false }) => {
  return (
    <div className={`user-card ${isSelected ? 'selected' : ''}`}>
      <h2>{user.name}</h2>
      <p>Email: {user.email}</p>
      <button onClick={onSelect}>Select</button>
    </div>
  );
};
```

#### `no-prop-spreading`

Prevents the use of prop spreading in JSX components, encouraging explicit prop passing.

**Incorrect** ❌:

```tsx
const UserProfile = (props) => {
  return <ProfileCard {...props} />;
};
```

**Correct** ✅:

```tsx
// Explicitly list all props
const UserProfile = ({ name, email, avatar, onEdit }) => {
  return (
    <ProfileCard 
      name={name}
      email={email}
      avatar={avatar}
      onEdit={onEdit}
    />
  );
};

// Exception: When creating HOCs
const withAnalytics = (WrappedComponent) => {
  return function WithAnalytics(props) {
    const trackEvent = useAnalytics();
    return <WrappedComponent {...props} trackEvent={trackEvent} />;
  };
};
```

#### `prop-ordering`

Enforces a consistent order for props in React components.

**Incorrect** ❌:

```tsx
<Button
  onClick={handleClick}
  disabled={isLoading}
  type="submit"
  variant="primary"
>
  {isLoading ? 'Loading...' : 'Submit'}
</Button>
```

**Correct** ✅:

```tsx
// Required props first, then optional, then event handlers
<Button
  type="submit"
  variant="primary"
  disabled={isLoading}
  onClick={handleClick}
>
  {isLoading ? 'Loading...' : 'Submit'}
</Button>

// With TypeScript interface
interface ButtonProps {
  // Required props first
  type: 'button' | 'submit' | 'reset';
  
  // Optional props
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  disabled?: boolean;
  
  // Event handlers last
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
}
```

## Performance

### Rendering Optimizations

#### `no-inline-functions`

Prevents inline function definitions in JSX props to avoid unnecessary re-renders.

**Incorrect** ❌:

```tsx
<button onClick={() => handleClick(id)}>Click me</button>
```

**Correct** ✅:

```tsx
// Define handler outside render
const handleButtonClick = useCallback(() => handleClick(id), [id]);

return <button onClick={handleButtonClick}>Click me</button>;
```

#### `require-keys`

Enforces `key` prop usage in lists to help React identify which items have changed.

**Incorrect** ❌:

```tsx
{items.map(item => (
  <ItemComponent item={item} />
))}
```

**Correct** ✅:

```tsx
{items.map(item => (
  <ItemComponent key={item.id} item={item} />
))}
```

#### `memo-comparison`

Ensures proper implementation of comparison functions in `React.memo`.

**Incorrect** ❌:

```tsx
const MemoizedComponent = React.memo(MyComponent, (prevProps, nextProps) => {
  return prevProps.id === nextProps.id; // Shallow comparison of complex objects
});
```

**Correct** ✅:

```tsx
const MemoizedComponent = React.memo(MyComponent, (prevProps, nextProps) => {
  // Proper deep comparison of relevant props
  return isEqual(prevProps.data, nextProps.data) && 
         prevProps.callback === nextProps.callback;
});
```

#### `require-memo`

Enforces `React.memo` for components that don't use context to prevent unnecessary re-renders.

**Incorrect** ❌:

```tsx
const SimpleComponent = ({ value }) => (
  <div>{value}</div>
);
```

**Correct** ✅:

```tsx
const SimpleComponent = React.memo(({ value }) => (
  <div>{value}</div>
));
SimpleComponent.displayName = 'SimpleComponent';
```

#### `max-props`

Prevents components from having too many props, which can indicate poor component design.

**Incorrect** ❌:

```tsx
<UserProfile 
  id={id}
  name={name}
  email={email}
  avatar={avatar}
  role={role}
  status={status}
  lastLogin={lastLogin}
  onEdit={handleEdit}
  onDelete={handleDelete}
  onMessage={handleMessage}
  onBlock={handleBlock}
  showActions={showActions}
  theme={theme}
  className={className}
  style={style}
  // ... many more props
/>
```

**Better** ✅:

```tsx
// Break down into smaller, focused components
<UserCard 
  user={{
    id,
    name,
    email,
    avatar,
    role,
    status,
    lastLogin
  }}
  actions={{
    onEdit: handleEdit,
    onDelete: handleDelete,
    onMessage: handleMessage,
    onBlock: handleBlock
  }}
  ui={{
    showActions,
    theme,
    className,
    style
  }}
/>
```

## TypeScript Specific

### Type Safety

#### `strict-null-checks`

Enforces strict null checks to prevent null/undefined errors.

**Incorrect** ❌:

```typescript
type User = {
  name: string;
  email?: string;  // Potentially undefined
};

function getEmail(user: User): string {
  return user.email;  // Could be undefined
}
```

**Correct** ✅:

```typescript
type User = {
  name: string;
  email: string | undefined;  // Explicitly marked as potentially undefined
};

function getEmail(user: User): string | undefined {
  return user.email;  // Return type reflects possible undefined
}
```

#### `no-non-null-assertion`

Forbids the use of non-null assertions (`!`).

**Incorrect** ❌:

```typescript
function getLength(str: string | null): number {
  return str!.length;  // Unsafe non-null assertion
}
```

**Correct** ✅:

```typescript
function getLength(str: string | null): number {
  if (str === null) {
    throw new Error('String cannot be null');
  }
  return str.length;  // Type-safe access after null check
}
```

#### `explicit-undefined`

Enforces explicit `| undefined` for optional types.

**Incorrect** ❌:

```typescript
interface Props {
  title?: string;
  onClose?(): void;
}
```

**Correct** ✅:

```typescript
interface Props {
  title: string | undefined;
  onClose: (() => void) | undefined;
}
```

#### `explicit-function-return-type`

Requires explicit return types for all functions.

**Incorrect** ❌:

```typescript
function add(a: number, b: number) {
  return a + b;
}
```

**Correct** ✅:

```typescript
function add(a: number, b: number): number {
  return a + b;
}

// For React components
const Button: React.FC<ButtonProps> = ({ children }) => (
  <button>{children}</button>
);
```

#### `no-unsafe-any`

Prevents `any` and `unknown` types without explicit justification.

**Incorrect** ❌:

```typescript
function processData(data: any) {
  // No type safety
  return data.map(item => item.value);
}
```

**Correct** ✅:

```typescript
interface DataItem {
  value: unknown;
  // ... other fields
}

function processData(data: DataItem[]): unknown[] {
  return data.map(item => item.value);
}
```

#### `type-imports`

Enforces type imports for type-only imports.

**Incorrect** ❌:

```typescript
import { User, fetchUser } from './api';
```

**Correct** ✅:

```typescript
import type { User } from './api';
import { fetchUser } from './api';
```

#### `no-ts-ignore`

Prevents `@ts-ignore` and `@ts-expect-error` without comments.

**Incorrect** ❌:

```typescript
// @ts-ignore
const value: string = 123;
```

**Acceptable with Comment** ✅:

```typescript
// @ts-expect-error - Temporary workaround for API issue #123
const value: string = getValueFromAPI();
```

#### `prefer-globalthis-timers`

Enforces `globalThis` for timer functions.

**Incorrect** ❌:

```typescript
const timer = setTimeout(() => {}, 1000);
```

**Correct** ✅:

```typescript
const timer = globalThis.setTimeout(() => {}, 1000);
```

#### `explicit-return-undefined`

Enforces explicit `undefined` in function return types.

**Incorrect** ❌:

```typescript
function findUser(id: string): User {
  if (!users.has(id)) {
    return;  // Implicit undefined return
  }
  return users.get(id);
}
```

**Correct** ✅:

```typescript
function findUser(id: string): User | undefined {
  if (!users.has(id)) {
    return undefined;  // Explicit undefined return
  }
  return users.get(id);
}
```

#### `prefer-typeof-undefined`

Enforces `typeof` for undefined checks.

**Incorrect** ❌:

```typescript
if (value === undefined) {
  // ...
}
```

**Correct** ✅:

```typescript
if (typeof value === 'undefined') {
  // ...
}
```

## Code Organization

### Import/Export

#### `import-order`

Enforces a consistent order for imports to improve code readability.

**Incorrect** ❌:

```typescript
import { Button } from './Button';
import React from 'react';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
```

**Correct** ✅:

```typescript
// 1. Node.js built-ins
import path from 'node:path';

// 2. External dependencies
import React from 'react';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';

// 3. Internal absolute imports (from src/)
import { api } from 'src/lib/api';

// 4. Internal relative imports
import { Button } from './Button';
import type { User } from '../types';
```

#### `no-circular-dependencies`

Prevents circular dependencies between modules.

**Incorrect** ❌:

```typescript
// user.ts
export class User {
  constructor(public role: Role) {}
}

// role.ts
import { User } from './user';
export class Role {
  constructor(public users: User[] = []) {}
}
```

**Better** ✅:

```typescript
// types.ts
export interface IUser {
  role: IRole;
}

export interface IRole {
  users: IUser[];
}

// user.ts
import type { IRole } from './types';
export class User implements IUser {
  constructor(public role: IRole) {}
}

// role.ts
import type { IUser } from './types';
export class Role implements IRole {
  users: IUser[] = [];
}
```

#### `module-boundaries`

Enforces architectural boundaries between different parts of the application.

**Incorrect** ❌:

```typescript
// features/dashboard/components/UserList.tsx
import { User } from '../../../app/models/User';  // Deep relative import
```

**Correct** ✅:

```typescript
// features/dashboard/components/UserList.tsx
import { User } from 'app/models/User';  // Absolute import

// OR using path aliases
import { User } from '@/app/models/User';
```

#### `no-barrel-files`

Prevents the use of barrel files to avoid potential issues with tree-shaking and circular dependencies.

**Incorrect** ❌:

```typescript
// components/index.ts
export * from './Button';
export * from './Input';
export * from './Card';
```

**Better** ✅:

```typescript
// Import directly from component files
import { Button } from './components/Button';
import { Input } from './components/Input';
import { Card } from './components/Card';
```

#### `naming-convention`

Enforces consistent naming conventions across the codebase.

**Incorrect** ❌:

```typescript
// Inconsistent file naming
components/button/Button.tsx
components/input/input.tsx
utils/formatDate.ts
utils/fetch_data.ts
```

**Correct** ✅:

```typescript
// Consistent kebab-case for file names
components/button/button.tsx
components/input/input.tsx
utils/format-date.ts
utils/fetch-data.ts

// Or consistent PascalCase for component files
components/Button/Button.tsx
components/Input/Input.tsx
utils/formatDate.ts
utils/fetchData.ts
```

**For React Components** ✅:

```typescript
// Component files use PascalCase
components/UserProfile/UserProfile.tsx
components/UserProfile/index.ts
components/UserProfile/types.ts
components/UserProfile/utils.ts

// Test files use .test.ts(x)
components/UserProfile/__tests__/UserProfile.test.tsx

// Storybook files use .stories.ts(x)
components/UserProfile/UserProfile.stories.tsx
```

## Accessibility (a11y)

### a11y Rules

#### `require-alt-text`

Ensures all images have appropriate alt text for screen readers.

**Incorrect** ❌:

```tsx
<img src="logo.png" />
<img src="decorative.png" alt="" />  // Missing descriptive text
```

**Correct** ✅:

```tsx
<img 
  src="logo.png" 
  alt="Company Logo" 
  width="120" 
  height="40"
/>

{/* Decorative images should have empty alt and be hidden from screen readers */}
<img 
  src="divider.png" 
  alt="" 
  role="presentation"
  aria-hidden="true"
/>
```

#### `aria-attributes`

Ensures proper usage of ARIA attributes for accessibility.

**Incorrect** ❌:

```tsx
<div 
  role="button" 
  onClick={handleClick}
>
  Save
</div>
```

**Correct** ✅:

```tsx
<button 
  type="button"
  onClick={handleClick}
  aria-label="Save changes"
>
  Save
</button>

{/* For custom interactive components */}
<div 
  role="button"
  tabIndex={0}
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
  aria-pressed={isPressed}
>
  Toggle
</div>
```

#### `keyboard-accessibility`

Ensures all interactive elements are keyboard accessible.

**Incorrect** ❌:

```tsx
<div 
  className="menu-item"
  onClick={handleClick}
>
  Menu Item
</div>
```

**Correct** ✅:

```tsx
<button 
  className="menu-item"
  onClick={handleClick}
  onKeyDown={(e) => e.key === 'Enter' && handleClick()}
>
  Menu Item
</button>

{/* For custom interactive components */}
<div 
  role="button"
  tabIndex={0}
  className="menu-item"
  onClick={handleClick}
  onKeyDown={(e) => {
    if (['Enter', ' '].includes(e.key)) {
      e.preventDefault();
      handleClick();
    }
  }}
>
  Menu Item
</div>
```

#### `semantic-html`

Encourages the use of semantic HTML elements.

**Incorrect** ❌:

```tsx
<div className="header">
  <div className="nav">
    <div>Home</div>
    <div>About</div>
  </div>
</div>
```

**Correct** ✅:

```tsx
<header>
  <nav>
    <ul style={{ listStyle: 'none', display: 'flex', gap: '1rem' }}>
      <li><a href="/">Home</a></li>
      <li><a href="/about">About</a></li>
    </ul>
  </nav>
</header>
```

#### `heading-hierarchy`

Ensures proper heading hierarchy for better document structure.

**Incorrect** ❌:

```tsx
<h1>Main Title</h1>
<h3>Section Title</h3>  {/* Skipped h2 */}
<h4>Subsection</h4>
<h2>Another Section</h2>  /* Inconsistent hierarchy */
```

**Correct** ✅:

```tsx
<h1>Main Title</h1>
<section>
  <h2>Section Title</h2>
  <article>
    <h3>Article Title</h3>
    <p>Content...</p>
  </article>
</section>
<section>
  <h2>Another Section</h2>
  <p>More content...</p>
</section>
```

## Error Boundaries

### Error Handling

#### `require-error-boundary`

Ensures that components with async operations or potential runtime errors are wrapped in error boundaries.

**Incorrect** :

```tsx
const UserProfile = ({ userId }) => {
  const { data: user, error } = useQuery(['user', userId], fetchUser);
  
  if (error) throw error;  // Uncaught error in render
  
  return (
    <div>
      <h1>{user.name}</h1>
      {/* ... */}
    </div>
  );
};
```

**Correct** :

```tsx
// ErrorBoundary.jsx
class ErrorBoundary extends React.Component {
  state = { hasError: false, error: null };
  
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  
  componentDidCatch(error, errorInfo) {
    // Log error to error reporting service
    logErrorToService(error, errorInfo);
  }
  
  render() {
    if (this.state.hasError) {
      return this.props.fallback || <div>Something went wrong.</div>;
    }
    
    return this.props.children;
  }
}

// UserProfile.jsx
const UserProfile = ({ userId }) => {
  const { data: user, error } = useQuery(['user', userId], fetchUser);
  
  if (error) throw error;
  
  return (
    <div>
      <h1>{user.name}</h1>
      {/* ... */}
    </div>
  );
};

// Usage
const App = () => (
  <ErrorBoundary fallback={<div>Failed to load user profile</div>}>
    <UserProfile userId="123" />
  </ErrorBoundary>
);
```

#### `error-boundary-fallback`

Enforces that error boundaries provide meaningful fallback UIs.

**Incorrect** :

```tsx
class ErrorBoundary extends React.Component {
  // ...
  render() {
    if (this.state.hasError) {
      return null;  // No fallback UI
    }
    return this.props.children;
  }
}
```

**Correct** :

```tsx
class ErrorBoundary extends React.Component {
  // ...
  render() {
    if (this.state.hasError) {
      return (
        <div className="error-boundary">
          <h2>Something went wrong</h2>
          <p>Please try again later or contact support.</p>
          <button onClick={() => window.location.reload()}>
            Reload Page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
```

#### `prevent-unhandled-rejections`

Prevents unhandled promise rejections in async operations.

**Incorrect** :

```tsx
const fetchData = async () => {
  const response = await fetch('/api/data');
  return response.json();
};

// Unhandled promise rejection
const handleClick = () => {
  fetchData().then(data => setData(data));
};
```

**Correct** :

```tsx
const fetchData = async () => {
  try {
    const response = await fetch('/api/data');
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    return await response.json();
  } catch (error) {
    // Handle or re-throw the error
    console.error('Error fetching data:', error);
    throw error; // Let the error boundary handle it
  }
};

// Handle promise properly
const handleClick = async () => {
  try {
    const data = await fetchData();
    setData(data);
  } catch (error) {
    setError(error);
  }
};
```

#### `enforce-error-logging`

Ensures proper error logging in error boundaries and async operations.

**Incorrect** :

```tsx
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    // No error logging
    console.error(error);  // Console logging only
  }
  // ...
}
```

**Correct** :

```tsx
class ErrorBoundary extends React.Component {
  componentDidCatch(error, errorInfo) {
    // Log to error reporting service
    logErrorToService(error, errorInfo);
    
    // Also log to console in development
    if (process.env.NODE_ENV === 'development') {
      console.error('ErrorBoundary caught an error:', error, errorInfo);
    }
  }
  // ...
}

// In API utilities
export const api = {
  async get(url) {
    try {
      const response = await fetch(url);
      if (!response.ok) {
        const error = new Error(`HTTP error! status: ${response.status}`);
        error.status = response.status;
        throw error;
      }
      return await response.json();
    } catch (error) {
      // Log the error
      logErrorToService(error, { url });
      throw error; // Re-throw to let the caller handle it
    }
  }
};
```

## Documentation

### JSDoc Requirements

#### `require-jsdoc`

Enforces JSDoc comments for all exported functions and components to improve code maintainability and IDE support.

**Incorrect** ❌:

```typescript
export function formatDate(date) {
  return new Date(date).toLocaleDateString();
}

export const Button = ({ onClick, children }) => (
  <button onClick={onClick}>{children}</button>
);
```

**Correct** ✅:

```typescript
/**
 * Formats a date string into a localized date string
 * @param {string|Date} date - The date to format
 * @returns {string} Formatted date string
 */
export function formatDate(date: string | Date): string {
  return new Date(date).toLocaleDateString();
}

/**
 * A reusable button component
 * @param {Object} props - Component props
 * @param {Function} props.onClick - Click handler function
 * @param {React.ReactNode} props.children - Button content
 * @returns {JSX.Element} Rendered button element
 */
export const Button = ({ onClick, children }: ButtonProps) => (
  <button onClick={onClick}>{children}</button>
);
```

#### `prop-type-docs`

Requires documentation for all component props, including type information and descriptions.

**Incorrect** ❌:

```typescript
interface UserProfileProps {
  user: User;
  onUpdate: (user: User) => void;
  isAdmin?: boolean;
}

export function UserProfile({ user, onUpdate, isAdmin = false }: UserProfileProps) {
  // ...
}
```

**Correct** ✅:

```typescript
/**
 * User profile display and edit component
 */
interface UserProfileProps {
  /** The user data to display */
  user: User;
  
  /** 
   * Callback when user data is updated
   * @param {User} updatedUser - The updated user object 
   */
  onUpdate: (updatedUser: User) => void;
  
  /** 
   * Whether the current user has admin privileges
   * @default false
   */
  isAdmin?: boolean;
}

/**
 * Displays and allows editing of user profile information
 * @example
 * ```tsx
 * <UserProfile 
 *   user={currentUser}
 *   onUpdate={handleUpdateUser}
 *   isAdmin={userIsAdmin}
 * />
 * ```
 */
export function UserProfile({ user, onUpdate, isAdmin = false }: UserProfileProps) {
  // ...
}
```

#### `example-usage`

Enforces example usage in component documentation to demonstrate common patterns.

**Incorrect** ❌:

```typescript
/**
 * A modal dialog component
 */
export function Modal({ isOpen, onClose, children }) {
  // ...
}
```

**Correct** ✅:

```typescript
/**
 * A reusable modal dialog component
 * 
 * @example Basic usage
 * ```tsx
 * const [isOpen, setIsOpen] = useState(false);
 * 
 * return (
 *   <>
 *     <button onClick={() => setIsOpen(true)}>Open Modal</button>
 *     <Modal 
 *       isOpen={isOpen} 
 *       onClose={() => setIsOpen(false)}
 *     >
 *       <h2>Modal Title</h2>
 *       <p>Modal content goes here</p>
 *     </Modal>
 *   </>
 * );
 * ```
 * 
 * @example With custom close button
 * ```tsx
 * <Modal
 *   isOpen={isOpen}
 *   onClose={handleClose}
 *   closeButton={(
 *     <button className="custom-close">
 *       ×
 *     </button>
 *   )}
 * >
 *   Custom close button example
 * </Modal>
 * ```
 */
export function Modal({ isOpen, onClose, children, closeButton }) {
  // ...
}
```

#### `complex-state-docs`

Requires documentation for complex state logic, especially when using `useReducer` or complex `useState`.

**Incorrect** ❌:

```typescript
const [state, dispatch] = useReducer(reducer, initialState);
```

**Correct** ✅:

```typescript
/**
 * Manages the form state with validation
 * @typedef {Object} FormState
 * @property {string} email - User's email address
 * @property {string} password - User's password
 * @property {boolean} isSubmitting - Whether form is being submitted
 * @property {string[]} errors - List of form errors
 */

/**
 * Reducer for form state management
 * @param {FormState} state - Current form state
 * @param {Object} action - Action object
 * @param {string} action.type - Action type
 * @param {string} [action.payload] - Action payload
 * @returns {FormState} New form state
 */
const formReducer = (state, { type, payload }) => {
  // Reducer implementation...
};

// Usage with JSDoc
const [formState, dispatch] = useReducer(formReducer, {
  email: '',
  password: '',
  isSubmitting: false,
  errors: []
});
```

#### `side-effects-docs`

Requires documentation for side effects in components and hooks.

**Incorrect** ❌:

```typescript
useEffect(() => {
  const subscription = data$.subscribe(handleData);
  return () => subscription.unsubscribe();
}, []);
```

**Correct** ✅:

```typescript
/**
 * Subscribes to real-time data updates
 * @param {string} dataSource - The data source to subscribe to
 * @param {Function} onData - Callback when new data is received
 * @param {Array} dependencies - Dependencies for the effect
 */
function useDataSubscription(dataSource, onData, dependencies = []) {
  useEffect(() => {
    /**
     * @type {Subscription}
     */
    let subscription;
    
    // Subscribe to data source
    const subscribe = async () => {
      try {
        const data$ = await getDataStream(dataSource);
        subscription = data$.subscribe({
          next: onData,
          error: (error) => {
            console.error('Data subscription error:', error);
            // Attempt to resubscribe on error
            subscribe();
          }
        });
      } catch (error) {
        console.error('Failed to subscribe to data source:', error);
      }
    };
    
    // Initial subscription
    subscribe();
    
    // Cleanup subscription on unmount or when dependencies change
    return () => {
      if (subscription) {
        subscription.unsubscribe();
      }
    };
  }, [dataSource, onData, ...dependencies]);
}
```

## Styling

### CSS-in-JS

#### `no-inline-styles`

Prevents the use of inline styles in favor of CSS classes or CSS-in-JS solutions for better maintainability and performance.

**Incorrect** ❌:

```tsx
function Button() {
  return (
    <button 
      style={{
        padding: '8px 16px',
        backgroundColor: '#007bff',
        color: 'white',
      borderRadius: '4px',
      border: 'none',
      cursor: 'pointer',
      ':hover': {
        backgroundColor: '#0056b3'
      }
    }}
  >
    Click me
  </button>
);
}
```

**Correct** ✅:

```tsx
// Using CSS Modules
import styles from './Button.module.css';

const Button = () => (
  <button className={styles.primaryButton}>
    Click me
  </button>
);

// OR using styled-components/emotion
import styled from 'styled-components';

const StyledButton = styled.button`
  padding: 8px 16px;
  background-color: #007bff;
  color: white;
  border-radius: 4px;
  border: none;
  cursor: pointer;
  
  &:hover {
    background-color: #0056b3;
  }
`;

const Button = () => <StyledButton>Click me</StyledButton>;
```

#### `css-variables`

Enforces the use of CSS variables for theming and consistent styling.

**Incorrect** ❌:

```tsx
const Container = styled.div`
  background-color: #ffffff;
  color: #333333;
  padding: 16px;
  border: 1px solid #e0e0e0;
`;
```

**Correct** ✅:

```tsx
// In your theme or global styles
:root {
  --color-background: #ffffff;
  --color-text: #333333;
  --color-border: #e0e0e0;
  --spacing-md: 16px;
}

const Container = styled.div`
  background-color: var(--color-background);
  color: var(--color-text);
  padding: var(--spacing-md);
  border: 1px solid var(--color-border);
  
  /* With theme support */
  @media (prefers-color-scheme: dark) {
    --color-background: #1a1a1a;
    --color-text: #f5f5f5;
    --color-border: #444444;
  }
`;
```

#### `naming-convention-styles`

Enforces consistent naming conventions for CSS classes and styled components.

**Incorrect** ❌:

```tsx
// Inconsistent naming
const Button = styled.button`
  /* ... */
`;

const red_button = styled(Button)`
  background-color: red;
`;

const BlueBtn = styled(Button)`
  background-color: blue;
`;

const GreenButton = styled(Button)`
  background-color: green;
`;
```

**Correct** ✅:

```tsx
// Base component
const Button = styled.button`
  /* base styles */
  padding: 8px 16px;
  border-radius: 4px;
  cursor: pointer;
`;

// Variants using BEM-like naming
const ButtonRed = styled(Button)`
  background-color: #dc3545;
  color: white;
  
  &:hover {
    background-color: #c82333;
  }
`;

const ButtonBlue = styled(Button)`
  background-color: #007bff;
  color: white;
  
  &:hover {
    background-color: #0056b3;
  }
`;

// With variants using props
const ButtonVariant = styled(Button)`
  background-color: ${props => 
    props.variant === 'primary' ? '#007bff' : 
    props.variant === 'danger' ? '#dc3545' : 
    '#6c757d'
  };
  color: white;
  
  &:hover {
    opacity: 0.9;
  }
`;
```

#### `no-nested-selectors`

Prevents deeply nested CSS selectors to maintain specificity and improve performance.

**Incorrect** ❌:

```tsx
const Card = styled.div`
  border: 1px solid #ddd;
  border-radius: 8px;
  padding: 16px;
  
  .card-header {
    display: flex;
    justify-content: space-between;
    margin-bottom: 12px;
    
    h2 {
      margin: 0;
      font-size: 1.25rem;
      
      small {
        font-size: 0.875rem;
        color: #666;
      }
    }
    
    .actions {
      button {
        margin-left: 8px;
      }
    }
  }
  
  .card-body {
    /* ... */
  }
`;
```

**Better** ✅:

```tsx
// Break down into smaller, focused components
const Card = styled.div`
  border: 1px solid var(--color-border);
  border-radius: 8px;
  padding: 16px;
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  margin-bottom: 12px;
`;

const CardTitle = styled.h2`
  margin: 0;
  font-size: 1.25rem;
`;

const CardSubtitle = styled.small`
  font-size: 0.875rem;
  color: var(--color-text-secondary);
`;

const CardActions = styled.div`
  display: flex;
  gap: 8px;
`;

const CardBody = styled.div`
  /* ... */
`;

// Usage
const UserCard = () => (
  <Card>
    <CardHeader>
      <div>
        <CardTitle>
          John Doe
          <CardSubtitle>Admin</CardSubtitle>
        </CardTitle>
      </div>
      <CardActions>
        <ButtonVariant variant="primary">Edit</ButtonVariant>
        <ButtonVariant variant="danger">Delete</ButtonVariant>
      </CardActions>
    </CardHeader>
    <CardBody>
      {/* Card content */}
    </CardBody>
  </Card>
);
```

## Hooks

### Custom Hooks

#### `hook-dependencies`

Ensures that all dependencies are properly specified in the dependency array of hooks.

**Incorrect** ❌:

```tsx
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    // Missing userId in dependency array
    fetchUser(userId).then(setUser);
  }, []); // ❌ Missing userId
  
  // ...
}
```

**Correct** ✅:

```tsx
function UserProfile({ userId }) {
  const [user, setUser] = useState(null);
  
  useEffect(() => {
    fetchUser(userId).then(setUser);
  }, [userId]); // ✅ All dependencies are specified
  
  // ...
}
```

#### `rules-of-hooks`

Enforces the Rules of Hooks to prevent bugs and unexpected behavior.

**Incorrect** ❌:

```tsx
function BadExample({ shouldFetch }) {
  // ❌ Conditional hook call
  if (shouldFetch) {
    const [data, setData] = useState(null);
  }
  
  // ❌ Hook inside a loop
  const items = [1, 2, 3].map(item => {
    const [value, setValue] = useState(item);
    return value;
  });
  
  // ❌ Hook after early return
  if (condition) return null;
  const [state, setState] = useState(initialState);
  
  return <div>Bad example</div>;
}
```

**Correct** ✅:

```tsx
function GoodExample({ shouldFetch }) {
  // ✅ Call hooks at the top level
  const [data, setData] = useState(null);
  const [items, setItems] = useState([1, 2, 3]);
  const [state, setState] = useState(initialState);
  
  // Handle conditional logic inside effects
  useEffect(() => {
    if (shouldFetch) {
      fetchData().then(setData);
    }
  }, [shouldFetch]);
  
  // Handle derived state
  const processedItems = useMemo(() => {
    return items.map(item => processItem(item));
  }, [items]);
  
  if (condition) {
    return null;
  }
  
  return <div>Good example</div>;
}
```

#### `no-conditional-hooks`

Prevents conditional calls of hooks which can lead to bugs.

**Incorrect** ❌:

```tsx
function BadComponent({ isLoggedIn }) {
  // ❌ Conditional hook call
  if (isLoggedIn) {
    const [user, setUser] = useState(null);
  }
  
  // ❌ Conditional hook call in nested function
  const fetchData = () => {
    const [data, setData] = useState(null);
    // ...
  };
  
  return <div>Bad example</div>;
}
```

**Correct** ✅:

```tsx
function GoodComponent({ isLoggedIn }) {
  // ✅ Always call hooks at the top level
  const [user, setUser] = useState(null);
  const [data, setData] = useState(null);
  
  // Handle conditional logic inside effects
  useEffect(() => {
    if (isLoggedIn) {
      fetchUser().then(setUser);
    }
  }, [isLoggedIn]);
  
  // Extract logic to custom hooks if needed
  const fetchData = useCallback(async () => {
    const result = await fetchSomeData();
    setData(result);
  }, []);
  
  return <div>Good example</div>;
}
```

#### `hook-dependencies-custom`

Enforces proper dependency tracking in custom hooks.

**Incorrect** ❌:

```tsx
function useUserData(userId) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  const fetchData = async () => {
    setIsLoading(true);
    try {
      const data = await fetchUser(userId);
      setUser(data);
    } finally {
      setIsLoading(false);
    }
  };
  
  // ❌ Missing dependency: fetchData depends on userId
  useEffect(() => {
    fetchData();
  }, []);
  
  return { user, isLoading, refresh: fetchData };
}
```

**Correct** ✅:

```tsx
function useUserData(userId) {
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  
  // ✅ Wrap the function in useCallback with proper dependencies
  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await fetchUser(userId);
      setUser(data);
    } finally {
      setIsLoading(false);
    }
  }, [userId]); // ✅ All dependencies are specified
  
  // ✅ Include fetchData in the dependency array
  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  // Memoize the returned object to prevent unnecessary re-renders
  return useMemo(() => ({
    user,
    isLoading,
    refresh: fetchData
  }), [user, isLoading, fetchData]);
}
```

**Best Practices for Custom Hooks**

1. **Naming Convention**: Always prefix your custom hooks with `use` (e.g., `useLocalStorage`, `useFetch`).

2. **Return Values**: Return values in a consistent structure, preferably as an object for flexibility.

3. **Dependencies**: Be explicit about dependencies in your hooks to avoid stale closures.

4. **Documentation**: Document your custom hooks with JSDoc comments, including:
   - Purpose of the hook
   - Parameters and their types
   - Return value structure
   - Example usage

5. **Testing**: Write tests for your custom hooks using `@testing-library/react-hooks`.

6. **Error Handling**: Implement proper error handling in async operations.

7. **Performance**: Use `useCallback` and `useMemo` appropriately to optimize performance.

8. **Cleanup**: Always clean up subscriptions, event listeners, and timers in the cleanup function of `useEffect`.

9. **TypeScript**: Use TypeScript to provide type safety for your hooks.

10. **Composition**: Compose smaller hooks to build more complex functionality.

## Security

### Secure Coding

#### `safe-inner-html`

Prevents the use of `dangerouslySetInnerHTML` without proper sanitization to prevent XSS attacks.

**Incorrect** ❌:

```tsx
// ❌ Unsafe: Directly using user input without sanitization
function Comment({ text }) {
  return <div dangerouslySetInnerHTML={{ __html: text }} />;
}

// ❌ Also unsafe: Using DOMPurify with allowed tags that can execute JavaScript
function Comment({ text }) {
  const sanitized = DOMPurify.sanitize(text, { 
    ALLOWED_TAGS: ['script', 'img', 'style'] 
  });
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}
```

**Correct** ✅:

```tsx
// ✅ Safe: Using DOMPurify with safe configuration
import DOMPurify from 'dompurify';

function Comment({ text }) {
  // Configure DOMPurify to be safe
  const sanitized = DOMPurify.sanitize(text, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href', 'title', 'class'],
    ALLOWED_URI_REGEXP: /^(https?:\/\/)?[\w-]+(\.[\w-]+)*\.?(:[0-9]+)?[\/\w\-\.]*$/,
  });
  
  return <div dangerouslySetInnerHTML={{ __html: sanitized }} />;
}

// ✅ Better: Avoid using dangerouslySetInnerHTML when possible
function Comment({ text }) {
  // Simple text content is automatically escaped by React
  return <div>{text}</div>;
}
```

#### `secure-urls`

Enforces the use of secure URL protocols (https:, mailto:, tel:, etc.) and prevents protocol-relative URLs, JavaScript URLs, and other potentially dangerous URL schemes that could lead to security vulnerabilities.

**Incorrect** ❌:

```tsx
// ❌ Insecure: Uses HTTP which can be intercepted
<a href="http://example.com">Insecure Link</a>

// ❌ Protocol-relative URL: Inherits the protocol of the current page
<a href="//example.com">Protocol-relative Link</a>

// ❌ Potentially unsafe: JavaScript URLs can execute arbitrary code
<a href="javascript:alert('XSS')">Click me</a>

// ❌ Data URLs can be used to inject scripts
<a href="data:text/html;base64,PHNjcmlwdD5hbGVydCgnWFNTJyk8L3NjcmlwdD4=">Click me</a>

// ❌ Blob URLs can be used to execute code
const blob = new Blob(['alert("XSS")'], { type: 'text/javascript' });
const url = URL.createObjectURL(blob);
<a href={url}>Malicious Link</a>;

// ❌ Insecure WebSocket
const socket = new WebSocket('ws://example.com');
```

**Correct** ✅:

```tsx
// ✅ Secure: Uses HTTPS
<a href="https://example.com">Secure Link</a>

// ✅ Secure: Uses mailto
<a href="mailto:contact@example.com">Email Us</a>

// ✅ Secure: Uses tel
<a href="tel:+1234567890">Call Us</a>

// ✅ Secure: Uses relative path
<a href="/about">About Us</a>

// ✅ Secure: Uses a safe protocol with validation
function SafeLink({ href, children }) {
  const isSafe = useMemo(() => {
    try {
      const url = new URL(href, window.location.href);
      const ALLOWED_PROTOCOLS = ['https:', 'mailto:', 'tel:'];
      return ALLOWED_PROTOCOLS.includes(url.protocol);
    } catch {
      // Invalid URL or relative URL
      return true; // Assume relative URLs are safe
    }
  }, [href]);

  return isSafe ? <a href={href} rel="noopener noreferrer">{children}</a> : <span>{children}</span>;
}

// ✅ Secure WebSocket
const secureSocket = new WebSocket('wss://example.com');

// ✅ Safe dynamic URL construction
const apiBaseUrl = 'https://api.example.com';
const endpoint = '/users';
fetch(`${apiBaseUrl}${endpoint}`);
```

**Configuration Options**:

```json
{
  "rules": {
    "@vibecoder-rasp/secure-urls": [
      "error",
      {
        "allowHttp": false,
        "allowDataUrls": false,
        "allowBlobUrls": false,
        "allowLocalhost": true,
        "allowedProtocols": ["https:", "mailto:", "tel:"],
        "allowedDomains": ["example.com", "api.example.com"],
        "allowRelative": true,
        "requireHttps": true
      }
    ]
  }
}
```

- `allowHttp`: Allow HTTP protocol (default: `false`)
- `allowDataUrls`: Allow data: URLs (default: `false`)
- `allowBlobUrls`: Allow blob: URLs (default: `false`)
- `allowLocalhost`: Allow localhost and 127.0.0.1 (default: `true` in development)
- `allowedProtocols`: Array of allowed URL protocols (default: `["https:", "mailto:", "tel:"]`)
- `allowedDomains`: Array of allowed domains (default: `[]` - all domains allowed)
- `allowRelative`: Allow relative URLs (default: `true`)
- `requireHttps`: Require HTTPS for all external URLs (default: `true`)

**Best Practices**:

1. **Always Use HTTPS**:

   ```tsx
   // ❌ Bad
   const API_URL = 'http://api.example.com';
   
   // ✅ Good
   const API_URL = 'https://api.example.com';
   
   // ✅ Even better: Use environment variables
   const API_URL = process.env.REACT_APP_API_URL;
   ```

2. **Validate URLs**:

   ```tsx
   function isValidUrl(url: string): boolean {
     try {
       const { protocol, hostname } = new URL(url, window.location.href);
       const ALLOWED_PROTOCOLS = ['https:', 'http:'];
       const ALLOWED_DOMAINS = ['example.com', 'api.example.com'];
       
       return (
         ALLOWED_PROTOCOLS.includes(protocol) &&
         (ALLOWED_DOMAINS.includes(hostname) || hostname === window.location.hostname)
       );
     } catch {
       return false;
     }
   }
   ```

3. **Safe URL Construction**:

   ```tsx
   // ❌ Unsafe: String concatenation
   const url = 'http://' + userInput + '.example.com';
   
   // ✅ Safe: Use URL API
   function createSafeUrl(base: string, path: string) {
     const url = new URL(base);
     url.pathname = path;
     return url.toString();
   }
   ```

4. **Content Security Policy (CSP)**:

   ```html
   <meta 
     http-equiv="Content-Security-Policy" 
     content="default-src 'self'; 
             script-src 'self' 'unsafe-inline' cdn.example.com; 
             style-src 'self' 'unsafe-inline' fonts.googleapis.com; 
             img-src 'self' data: https:; 
             font-src 'self' fonts.gstatic.com;
             connect-src 'self' https://api.example.com;"
   >
   ```

5. **Secure WebSocket Connections**:

   ```tsx
   // ❌ Insecure
   const socket = new WebSocket('ws://example.com');
   
   // ✅ Secure
   const socket = new WebSocket('wss://example.com');
   
   // With authentication
   const token = getAuthToken();
   const socket = new WebSocket(`wss://example.com?token=${encodeURIComponent(token)}`);
   ```

**Common Pitfalls**:

1. **Open Redirects**:

   ```tsx
   // ❌ Vulnerable to open redirect
   function Redirect({ to }) {
     return <a href={to}>Continue</a>;
   }
   
   // ✅ Safe with validation
   function SafeRedirect({ to }) {
     const isSafe = useMemo(() => {
       try {
         const url = new URL(to, window.location.href);
         return url.hostname === window.location.hostname;
       } catch {
         return false;
       }
     }, [to]);
     
     return isSafe ? <a href={to}>Continue</a> : <span>Invalid link</span>;
   }
   ```

2. **Insecure Protocol Downgrade**:

   ```tsx
   // ❌ Insecure fallback
   const protocol = window.location.protocol === 'https:' ? 'https:' : 'http:';
   const apiUrl = `${protocol}//api.example.com`;
   
   // ✅ Always use HTTPS
   const apiUrl = 'https://api.example.com';
   ```

3. **Missing rel Attributes**:

   ```tsx
   // ❌ Missing rel attributes
   <a href="https://external.com">External Link</a>
   
   // ✅ Secure with rel attributes
   <a href="https://external.com" rel="noopener noreferrer" target="_blank">
     External Link
   </a>
   ```

**When to Disable**:

This rule should only be disabled in very specific cases where you need to allow certain protocols or domains that are blocked by default. Always document the reason for disabling the rule and ensure proper security measures are in place.

#### `no-unsafe-import`

Prevents importing of potentially unsafe modules that could lead to security vulnerabilities such as remote code execution, prototype pollution, or other malicious behavior.

**Incorrect** ❌:

```tsx
// ❌ Unsafe: Importing from untrusted or user-controlled sources
import * as untrustedModule from 'untrusted-package';
const dynamicModule = await import(userProvidedPath);

// ❌ Importing known vulnerable packages
import * as request from 'request'; // Has known vulnerabilities
import * as lodash from 'lodash'; // Large surface area, prefer individual imports

// ❌ Importing from non-https URLs
import('http://malicious-site.com/script.js');

// ❌ Dynamic imports without validation
function loadPlugin(pluginName) {
  // No validation of pluginName
  return import(`./plugins/${pluginName}`);
}
```

**Correct** ✅:

```tsx
// ✅ Safe: Importing from trusted, vetted packages
import { useState, useEffect } from 'react';
import { debounce } from 'lodash-es';

// ✅ Safe: Validated dynamic imports
const ALLOWED_PLUGINS = ['analytics', 'notifications'];

async function loadPlugin(pluginName: string) {
  if (!ALLOWED_PLUGINS.includes(pluginName)) {
    throw new Error(`Plugin ${pluginName} is not allowed`);
  }
  return import(`./plugins/${pluginName}`);
}

// ✅ Safe: Using content security hashes for scripts
const script = document.createElement('script');
script.src = 'https://example.com/script.js';
script.integrity = 'sha256-abc123...';
script.crossOrigin = 'anonymous';
document.head.appendChild(script);

// ✅ Safe: Using package.json "resolutions" to enforce secure versions
// {
//   "resolutions": {
//     "minimist": "^1.2.6" // Known secure version
//   }
// }
```

**Configuration Options**:

```json
{
  "rules": {
    "@vibecoder-rasp/no-unsafe-import": [
      "error",
      {
        "allowModules": ["react", "react-dom"],
        "forbidModules": ["request", "lodash"],
        "forbidHttpImports": true,
        "requireIntegrity": true,
        "allowedHosts": ["cdn.example.com"],
        "allowedScopes": ["@myorg"],
        "packageManager": "yarn"
      }
    ]
  }
}
```

- `allowModules`: Array of module names that are always allowed (e.g., core Node.js modules)
- `forbidModules`: Array of module names that are never allowed
- `forbidHttpImports`: Prevent importing from HTTP/HTTPS URLs (default: `true`)
- `requireIntegrity`: Require SRI hashes for external scripts (default: `true`)
- `allowedHosts`: Array of allowed hosts for dynamic imports
- `allowedScopes`: Array of allowed npm scopes (e.g., `["@myorg"]`)
- `packageManager`: Which package manager to check for known vulnerabilities (e.g., `"npm"`, `"yarn"`, `"pnpm"`)

**Best Practices**:

1. **Audit Dependencies**:

   ```bash
   # Check for known vulnerabilities
   npm audit
   yarn audit
   
   # Update vulnerable packages
   npm update [package] --depth [depth]
   ```

2. **Lockfile Integrity**:

   ```bash
   # Generate integrity hashes
   npm shrinkwrap --integrity
   
   # Verify package integrity
   npm ci
   ```

3. **Content Security Policy (CSP)**:

   ```html
   <meta 
     http-equiv="Content-Security-Policy" 
     content="default-src 'self'; 
             script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.example.com 'sha256-abc123...'; 
             style-src 'self' 'unsafe-inline' fonts.googleapis.com;"
   >
   ```

4. **Dependency Whitelisting**:

   ```json
   {
     "dependencies": {
       "react": "^18.2.0",
       "react-dom": "^18.2.0"
     },
     "resolutions": {
       "minimist": "^1.2.6"
     }
   }
   ```

5. **Module Federation Security**:

   ```js
   // webpack.config.js
   module.exports = {
     // ...
     output: {
       publicPath: 'auto',
       trustedTypes: true,
     },
     plugins: [
       new ModuleFederationPlugin({
         name: 'app1',
         filename: 'remoteEntry.js',
         exposes: {
           './Component': './src/Component',
         },
         shared: {
           react: { singleton: true },
           'react-dom': { singleton: true },
         },
       }),
     ],
   };
   ```

**Common Pitfalls**:

1. **Dependency Confusion**:

   ```bash
   # ❌ Bad: Could be a malicious package
   npm install my-private-package
   
   # ✅ Good: Use scoped packages
   npm install @myorg/private-package
   ```

2. **Overly Permissive Imports**:

   ```tsx
   // ❌ Bad: No validation of dynamic imports
   async function loadPlugin(name) {
     return import(`./plugins/${name}`);
   }
   
   // ✅ Good: Validate against allowlist
   const ALLOWED_PLUGINS = ['analytics', 'notifications'];
   
   async function loadPlugin(name) {
     if (!ALLOWED_PLUGINS.includes(name)) {
       throw new Error(`Plugin ${name} is not allowed`);
     }
     return import(`./plugins/${name}`);
   }
   ```

3. **Missing Integrity Checks**:

   ```tsx
   // ❌ Bad: No integrity check
   const script = document.createElement('script');
   script.src = 'https://example.com/script.js';
   
   // ✅ Good: With SRI hash
   const script = document.createElement('script');
   script.src = 'https://example.com/script.js';
   script.integrity = 'sha256-abc123...';
   script.crossOrigin = 'anonymous';
   ```

**When to Disable**:

This rule should only be disabled in specific cases where you need to import from a trusted source that's being flagged incorrectly. Always document the reason for disabling the rule and ensure proper security measures are in place.

#### `no-unsafe-fetch`

Prevents unsafe usage of the Fetch API and other HTTP clients that could lead to security vulnerabilities such as SSRF, XSS, or data leakage. This rule enforces secure practices when making HTTP requests.

**Incorrect** ❌:

```tsx
// ❌ Insecure: No error handling or response validation
fetch('http://api.example.com/data')
  .then(response => response.json())
  .then(console.log);

// ❌ Insecure: Using user input directly in URL
function getUserData(userId) {
  return fetch(`/api/users/${userId}`);
}

// ❌ Insecure: Sending sensitive data in URL parameters
function search(query) {
  return fetch(`/search?q=${query}`);
}

// ❌ Insecure: No timeout, could hang indefinitely
fetch('https://api.example.com/slow-endpoint');

// ❌ Insecure: Disabling SSL/TLS certificate validation
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

// ❌ Insecure: Using basic auth without HTTPS
const credentials = btoa('user:password');
fetch('http://api.example.com', {
  headers: { 'Authorization': `Basic ${credentials}` }
});
```

**Correct** ✅:

```tsx
// ✅ Secure: With proper error handling and response validation
async function fetchData() {
  try {
    const response = await fetch('https://api.example.com/data', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      credentials: 'same-origin',
      signal: AbortSignal.timeout(5000) // 5 second timeout
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const data = await response.json();
    // Validate response data structure
    if (!isValidData(data)) {
      throw new Error('Invalid response data');
    }
    
    return data;
  } catch (error) {
    console.error('Fetch error:', error);
    throw error;
  }
}

// ✅ Secure: Using a request utility with built-in security
import { secureFetch } from '../utils/api';

// ✅ Secure: URL construction with URLSearchParams
function search(query) {
  const url = new URL('/search', 'https://api.example.com');
  url.searchParams.append('q', encodeURIComponent(query));
  return secureFetch(url.toString());
}

// ✅ Secure: Using environment variables for API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'https://api.example.com';

// ✅ Secure: Rate limiting and retry logic
import pRetry from 'p-retry';

async function fetchWithRetry(url, options = {}) {
  return pRetry(
    () => fetch(url, options).then(res => {
      if (!res.ok) {
        throw new pRetry.AbortError(res.statusText);
      }
      return res.json();
    }),
    { retries: 3 }
  );
}
```

**Configuration Options**:

```json
{
  "rules": {
    "@vibecoder-rasp/no-unsafe-fetch": [
      "error",
      {
        "allowHttp": false,
        "allowedDomains": ["api.example.com", "cdn.example.com"],
        "requireHttps": true,
        "requireCors": true,
        "timeout": 10000,
        "maxBodySize": "1mb",
        "allowedMethods": ["GET", "POST", "PUT", "DELETE", "PATCH"],
        "disallowedHeaders": ["X-Powered-By"],
        "requireContentType": true
      }
    ]
  }
}
```

- `allowHttp`: Allow HTTP protocol (default: `false` in production)
- `allowedDomains`: Array of allowed domains for fetch requests (default: `[]` - all domains allowed)
- `requireHttps`: Require HTTPS for all external requests (default: `true`)
- `requireCors`: Require CORS headers for cross-origin requests (default: `true`)
- `timeout`: Maximum request timeout in milliseconds (default: `10000`)
- `maxBodySize`: Maximum allowed response body size (e.g., "1mb", "5mb")
- `allowedMethods`: Array of allowed HTTP methods (default: `["GET", "POST", "PUT", "DELETE", "PATCH"]`)
- `disallowedHeaders`: Array of disallowed request/response headers
- `requireContentType`: Require Content-Type header for requests with body (default: `true`)

**Best Practices**:

1. **Use a Request Wrapper**:

   ```tsx
   // utils/api.ts
   import { API_BASE_URL } from '../config';
   
   export async function secureFetch(
     endpoint: string,
     options: RequestInit = {}
   ): Promise<Response> {
     const url = endpoint.startsWith('http')
       ? endpoint
       : `${API_BASE_URL}${endpoint}`;
   
     const controller = new AbortController();
     const timeoutId = setTimeout(() => controller.abort(), 10000);
   
     try {
       const response = await fetch(url, {
         ...options,
         signal: controller.signal,
         headers: {
           'Content-Type': 'application/json',
           ...options.headers,
         },
         credentials: 'same-origin',
       });
   
       clearTimeout(timeoutId);
   
       if (!response.ok) {
         const error = await response.json().catch(() => ({}));
         throw new Error(error.message || 'Request failed');
       }
   
       return response;
     } catch (error) {
       clearTimeout(timeoutId);
       throw error;
     }
   }
   ```

2. **Input Validation**:

   ```tsx
   function isValidUserId(userId: string): boolean {
     return /^[a-z0-9-]+$/.test(userId);
   }
   
   async function getUserData(userId: string) {
     if (!isValidUserId(userId)) {
       throw new Error('Invalid user ID');
     }
     return secureFetch(`/users/${encodeURIComponent(userId)}`);
   }
   ```

3. **Rate Limiting**:

   ```tsx
   import rateLimit from 'express-rate-limit';
   
   const limiter = rateLimit({
     windowMs: 15 * 60 * 1000, // 15 minutes
     max: 100, // limit each IP to 100 requests per windowMs
   });
   
   // Apply to all API routes
   app.use('/api/', limiter);
   ```

4. **CSRF Protection**:

   ```tsx
   // Server-side: Generate and send CSRF token
   app.use((req, res, next) => {
     res.cookie('XSRF-TOKEN', req.csrfToken());
     next();
   });
   
   // Client-side: Include CSRF token in requests
   function getCsrfToken() {
     return document.cookie
       .split('; ')
       .find(row => row.startsWith('XSRF-TOKEN='))
       ?.split('=')[1];
   }
   
   fetch('/api/data', {
     headers: {
       'X-XSRF-TOKEN': getCsrfToken() || ''
     }
   });
   ```

5. **Request Timeout**:

   ```tsx
   async function fetchWithTimeout(url: string, options: RequestInit = {}, timeout = 5000) {
     const controller = new AbortController();
     const timeoutId = setTimeout(() => controller.abort(), timeout);
   
     try {
       const response = await fetch(url, {
         ...options,
         signal: controller.signal,
       });
   
       clearTimeout(timeoutId);
       return response;
     } catch (error) {
       clearTimeout(timeoutId);
       throw error;
     }
   }
   ```

**Common Pitfalls**:

1. **SSRF (Server-Side Request Forgery)**:

   ```tsx
   // ❌ Vulnerable to SSRF
   app.get('/proxy', async (req, res) => {
     const { url } = req.query;
     const response = await fetch(url);
     res.send(await response.text());
   });
   
   // ✅ Secure: Validate and sanitize URLs
   const ALLOWED_DOMAINS = ['trusted.com'];
   
   function isSafeUrl(urlString: string): boolean {
     try {
       const url = new URL(urlString);
       return ALLOWED_DOMAINS.includes(url.hostname);
     } catch {
       return false;
     }
   }
   ```

2. **Information Leakage**:

   ```tsx
   // ❌ Leaks stack traces in error responses
   app.use((err, req, res, next) => {
     res.status(500).json({ error: err.message });
   });
   
   // ✅ Generic error responses
   app.use((err, req, res, next) => {
     console.error('Error:', err);
     res.status(500).json({ error: 'An unexpected error occurred' });
   });
   ```

3. **Insecure Redirects**:

   ```tsx
   // ❌ Open redirect vulnerability
   app.get('/redirect', (req, res) => {
     res.redirect(req.query.url);
   });
   
   // ✅ Safe redirect with validation
   const ALLOWED_REDIRECTS = {
     'home': '/',
     'login': '/auth/login',
     'profile': '/user/profile'
   };
   
   app.get('/redirect', (req, res) => {
     const target = ALLOWED_REDIRECTS[req.query.page] || '/';
     res.redirect(target);
   });
   ```

**When to Disable**:

This rule should only be disabled in specific cases where you need to make requests to untrusted or non-HTTPS endpoints for legitimate reasons. Always document the reason for disabling the rule and ensure proper security measures are in place.

#### `no-eval`

Prevents the use of `eval()` and other dangerous constructs that can execute arbitrary code.

**Incorrect** ❌:

```tsx
// ❌ Direct eval usage
const result = eval('2 + 2');

// ❌ Indirect eval
const dynamicEval = eval;
const result = dynamicEval('2 + 2');

// ❌ Function constructor
const sum = new Function('a', 'b', 'return a + b');

// ❌ setTimeout/setInterval with string argument
setTimeout("console.log('Hello')", 100);
setInterval("console.log('Hello')", 1000);

// ❌ Dynamic code execution through other APIs
const script = document.createElement('script');
script.textContent = 'alert("XSS")';
document.body.appendChild(script);

// ❌ Dynamic import with string concatenation
const moduleName = 'user' + userId;
import(moduleName).then(module => {
  // Potentially dangerous
});
```

**Correct** ✅:

```tsx
// ✅ Use JavaScript directly
const result = 2 + 2;

// ✅ Use function expressions
const sum = (a: number, b: number) => a + b;

// ✅ Use function references with setTimeout/setInterval
setTimeout(() => {
  console.log('Delayed message');
}, 1000);

// ✅ Use template literals for dynamic content
const greeting = 'Hello';
const name = 'User';
const message = `${greeting}, ${name}!`;

// ✅ For dynamic imports, use explicit mapping
const moduleMap = {
  user: () => import('./user'),
  profile: () => import('./profile'),
};

async function loadModule(moduleName: keyof typeof moduleMap) {
  const module = await moduleMap[moduleName]?.();
  return module?.default;
}
```

**Configuration Options**:

```json
{
  "rules": {
    "@vibecoder-rasp/no-eval": [
      "error",
      {
        "allowIndirect": false,
        "allowFunctionConstructor": false,
        "allowWithNext": false,
        "allowTemplateLiterals": true,
        "allowJsonParse": true,
        "allowDynamicImports": {
          "patterns": ["^@/components/", "^@/utils/"]
        }
      }
    ]
  }
}
```

- `allowIndirect`: Allow indirect eval calls (default: `false`)
- `allowFunctionConstructor`: Allow `new Function()` (default: `false`)
- `allowWithNext`: Allow eval in next.js dynamic imports (default: `false`)
- `allowTemplateLiterals`: Allow template literals (default: `true`)
- `allowJsonParse`: Allow `JSON.parse()` (default: `true`)
- `allowDynamicImports`: Configuration for allowing dynamic imports with specific patterns

**Best Practices**:

1. **Use TypeScript Type Guards**:

   ```tsx
   function isSafeData(data: unknown): data is { id: string } {
     return (
       typeof data === 'object' &&
       data !== null &&
       'id' in data &&
       typeof data.id === 'string'
     );
   }
   
   const data = JSON.parse(jsonString);
   if (isSafeData(data)) {
     // Type-safe usage
     console.log(data.id);
   }
   ```

2. **Use Web Workers**: For heavy computations, use Web Workers instead of `eval`

   ```tsx
   // worker.js
   self.onmessage = function(e) {
     const result = heavyComputation(e.data);
     self.postMessage(result);
   }; 
   
   // In your component
   const worker = new Worker('worker.js');
   worker.postMessage(data);
   worker.onmessage = (e) => setResult(e.data);
   ```

3. **Use Function Wrappers**: For dynamic function execution, use a safe wrapper

   ```tsx
   const safeFunctions = {
     add: (a: number, b: number) => a + b,
     greet: (name: string) => `Hello, ${name}!`,
   };
   
   function executeSafely(fnName: keyof typeof safeFunctions, ...args: unknown[]) {
     const fn = safeFunctions[fnName];
     return fn ? fn(...args) : null;
   }
   ```

4. **Content Security Policy (CSP)**:

   ```html
   <!-- Prevent eval and other unsafe operations -->
   <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self' 'unsafe-inline' cdn.example.com; object-src 'none';">
   ```

5. **Safe Expression Evaluation**:

   ```tsx
   function safeEval(expression: string, context: Record<string, unknown> = {}) {
     // Only allow specific operations
     const allowedGlobals = {
       Math,
       Date,
       Array,
       Object,
       Number,
       String,
       Boolean,
       isNaN,
       isFinite,
       parseFloat,
       parseInt,
       encodeURIComponent,
       decodeURIComponent,
       encodeURI,
       decodeURI,
       ...context
     };

     // Validate expression pattern
     if (!/^[\w\s+\-*\/()%.,[\]]+$/.test(expression)) {
       throw new Error('Invalid expression');
     }

     try {
       // Use function constructor with strict context
       const fn = new Function(
         ...Object.keys(allowedGlobals),
         `'use strict'; return (${expression});`
       );
       return fn(...Object.values(allowedGlobals));
     } catch (e) {
       console.error('Evaluation error:', e);
       return null;
     }
   }
   ```

#### `no-inner-html`

Prevents direct DOM manipulation that can lead to XSS vulnerabilities by disallowing the use of `innerHTML`, `outerHTML`, `insertAdjacentHTML`, and React's `dangerouslySetInnerHTML` with unsanitized content.

**Incorrect** ❌:

```tsx
// ❌ Direct DOM manipulation with innerHTML
function updateContent() {
  const element = document.getElementById('content');
  element.innerHTML = userInput; // Unsafe!
}

// ❌ Using dangerouslySetInnerHTML with unsanitized input
function UserProfile({ user }) {
  return <div dangerouslySetInnerHTML={{ __html: user.bio }} />;
}

// ❌ Using outerHTML
function replaceElement() {
  const element = document.querySelector('.target');
  element.outerHTML = '<div>' + userContent + '</div>';
}

// ❌ Using insertAdjacentHTML
document.body.insertAdjacentHTML('beforeend', userContent);

// ❌ Creating elements with innerHTML
const div = document.createElement('div');
div.innerHTML = userContent;
```

**Correct** ✅:

```tsx
// ✅ Use React's declarative approach (auto-escapes content)
function SafeComponent({ content }) {
  return <div>{content}</div>;
}

// ✅ Use textContent for plain text
function updateText() {
  const element = document.getElementById('content');
  element.textContent = userInput;
}

// ✅ If you must use dangerouslySetInnerHTML, sanitize first
import DOMPurify from 'dompurify';

function SanitizedContent({ html }) {
  const clean = DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a'],
    ALLOWED_ATTR: ['href', 'title', 'class', 'target', 'rel'],
    ALLOWED_URI_REGEXP: /^(https?:\/\/)?[\w-]+(\.[\w-]+)*\.?(:[0-9]+)?[\/\w\-\.]*$/,
  });
  
  return <div dangerouslySetInnerHTML={{ __html: clean }} />;
}

// ✅ Create elements safely
document.body.appendChild(
  Object.assign(document.createElement('p'), {
    textContent: 'Safe content',
    className: 'safe-paragraph'
  })
);
```

**Configuration Options**:

```json
{
  "rules": {
    "@vibecoder-rasp/no-inner-html": [
      "error",
      {
        "allowStaticContent": false,
        "allowSanitized": true,
        "allowedTags": ["b", "i", "em", "strong", "a", "br", "code", "pre"],
        "allowedAttributes": {
          "a": ["href", "title", "target", "rel"],
          "img": ["src", "alt", "title", "width", "height"]
        },
        "allowedUriPattern": "^https?://"
      }
    ]
  }
}
```

- `allowStaticContent`: Allow HTML content that is a literal string (default: `false`)
- `allowSanitized`: Allow usage with proper sanitization (default: `true`)
- `allowedTags`: List of allowed HTML tags when using sanitization
- `allowedAttributes`: Object mapping tags to their allowed attributes
- `allowedUriPattern`: Regex pattern for allowed URLs in attributes like `href` and `src`

**Best Practices**:

1. **Use React's Declarative Model**:

   ```tsx
   // ✅ Good: Let React handle the DOM
   function UserProfile({ name, bio }) {
     return (
       <div className="profile">
         <h2>{name}</h2>
         <p className="bio">{bio}</p>
       </div>
     );
   }
   ```

2. **Sanitize All User Input**:

   ```tsx
   import DOMPurify from 'dompurify';
   
   function sanitizeHtml(html: string): string {
     return DOMPurify.sanitize(html, {
       ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'a', 'p', 'br'],
       ALLOWED_ATTR: ['href', 'title', 'class', 'target', 'rel'],
       ALLOWED_URI_REGEXP: /^(https?:\/\/)?[\w-]+(\.[\w-]+)*\.?(:[0-9]+)?[\/\w\-\.]*$/,
       FORBID_TAGS: ['style', 'script', 'iframe', 'object', 'embed'],
       FORBID_ATTR: ['style', 'onclick', 'onerror']
     });
   }
   ```

3. **Use Safer DOM APIs**:

   ```tsx
   // Instead of innerHTML
   element.textContent = userInput;
   
   // Instead of createElement + innerHTML
   const div = document.createElement('div');
   const text = document.createTextNode(userInput);
   div.appendChild(text);
   
   // Instead of insertAdjacentHTML
   const p = document.createElement('p');
   p.textContent = 'New content';
   element.insertAdjacentElement('beforeend', p);
   ```

4. **Content Security Policy (CSP)**:

   ```html
   <!-- Add this to your HTML head -->
   <meta 
     http-equiv="Content-Security-Policy" 
     content="default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' cdn.example.com; style-src 'self' 'unsafe-inline' fonts.googleapis.com; img-src 'self' data: https:; font-src 'self' fonts.gstatic.com;"
   >
   ```

5. **Server-Side Protection**:
   - Always validate and sanitize user input on the server
   - Set appropriate security headers (X-XSS-Protection, X-Content-Type-Options, etc.)
   - Use a web application firewall (WAF) to filter malicious requests

**Common Pitfalls**:

1. **False Sense of Security**:

   ```tsx
   // ❌ Don't just replace <script> tags
   function naiveSanitize(html: string): string {
     return html.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
   }
   
   // Attackers can bypass with: <scr<script>ipt>alert('XSS')</scr</script>ipt>
   ```

2. **Incomplete Sanitization**:

   ```tsx
   // ❌ Don't just allow common tags
   function incompleteSanitize(html: string): string {
     return html.replace(/<script[^>]*>.*?<\/script>/gi, '')
               .replace(/javascript:/gi, '');
   }
   
   // Bypass: <img src="x" onerror="alert('XSS')">
   ```

3. **Context-Aware XSS**:

   ```tsx
   // ❌ Don't forget about different contexts
   function renderLink(href: string) {
     // Unsafe in href attribute
     return <a href={href}>Click me</a>;
   }
   
   // Safe version
   function renderLink(href: string) {
     // Validate URL format
     if (!/^https?:\/\//.test(href)) {
       return <span>Invalid URL</span>;
     }
     return <a href={href} rel="noopener noreferrer">Click me</a>;
   }
   ```

**When to Disable**:

This rule should only be disabled in very specific cases where you have complete control over the HTML content and are certain it's safe. Even then, consider:

1. Using a more specific allowlist of tags/attributes
2. Implementing server-side validation
3. Adding additional security headers
4. Documenting the security implications

```tsx
// ✅ For complex DOM manipulation, use refs safely
function SafeDomManipulation() {
  const divRef = useRef();
  
  useEffect(() => {
    // Only manipulate DOM in ways that don't involve user input
    const element = divRef.current;
    element.classList.add('highlight');

    return () => {
      element.classList.remove('highlight');
    };
  }, []);
  
  return <div ref={divRef}>Safe content</div>;
}

```

### Security Best Practices

1. **Input Validation**: Always validate and sanitize user input on both client and server sides.

2. **Content Security Policy (CSP)**: Implement a strong CSP to mitigate XSS attacks.

   ```html
   Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline' cdn.example.com;
   ```

3. **HTTP Headers**: Use security headers like:
   - `X-Content-Type-Options: nosniff`
   - `X-Frame-Options: DENY`
   - `X-XSS-Protection: 1; mode=block`
   - `Strict-Transport-Security: max-age=31536000; includeSubDomains`

4. **Regular Updates**: Keep all dependencies up to date to avoid known vulnerabilities.

5. **Security Linting**: Use security-focused ESLint plugins like `eslint-plugin-security`.

6. **Code Reviews**: Always perform security-focused code reviews for security-sensitive code.

7. **Automated Scanning**: Use automated security scanning tools in your CI/CD pipeline.

8. **Error Handling**: Never expose sensitive information in error messages.

## Bundle Size

### Code Splitting

- `dynamic-imports` - Enforce dynamic imports for large components
- `bundle-size-limit` - Prevent large bundle sizes
- `route-code-splitting` - Enforce code splitting for routes
- `dedupe-dependencies` - Prevent duplicate dependencies
- `tree-shaking` - Enforce tree-shaking friendly imports

## Development Experience

### Developer Ergonomics

- `merge-imports` - Merge imports from the same file
- `meaningful-names` - Enforce meaningful component and variable names
- `no-commented-code` - Prevent commented out code
- `consistent-errors` - Enforce consistent error messages
- `no-console-in-prod` - Prevent console.log in production code

## Performance Monitoring

### Metrics

- `perf-monitoring` - Enforce performance monitoring for critical paths
- `no-memory-leaks` - Prevent memory leaks
- `effect-cleanup` - Enforce proper cleanup in effects
- `component-size` - Prevent large component trees
- `virtualize-lists` - Enforce virtualization for large lists

## State Management (Advanced)

### State Updates

- `batch-updates` - Enforce batched state updates
- `no-state-updates-in-render` - Prevent state updates during render
- `state-reset` - Enforce proper state reset patterns

## TypeScript (Advanced)

### Type Safety

#### `discriminated-unions`

Enforces the use of discriminated unions for better type safety with state management.

**Incorrect** ❌:

```typescript
type State = {
  status: 'idle' | 'loading' | 'success' | 'error';
  data?: Data;
  error?: Error;
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_SUCCESS':
      return {
        ...state,
        status: 'success',
        data: action.payload,
        error: undefined, // Need to manually handle clearing error
      };
    // ...
  }
}
```

**Correct** ✅:

```typescript
type State =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: Data }
  | { status: 'error'; error: Error };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'FETCH_SUCCESS':
      return {
        status: 'success',
        data: action.payload,
      };
    // ...
  }
}
```

**Configuration Options**:

- `requireDiscriminatedUnions`: When `true`, enforces discriminated unions for all state types (default: `true`)
- `allowedStateTypes`: Array of type names that are exempt from this rule (default: `[]`)

#### `no-type-assertions`

Prevents the use of type assertions (`as` syntax) to encourage proper type safety.

**Incorrect** ❌:

```typescript
const element = document.getElementById('root') as HTMLDivElement;
const user = response.data as User;
```

**Correct** ✅:

```typescript
const element = document.getElementById('root');
if (!(element instanceof HTMLDivElement)) {
  throw new Error('Expected element to be a div');
}

function isUser(data: unknown): data is User {
  return (
    typeof data === 'object' &&
    data !== null &&
    'id' in data &&
    'name' in data
  );
}

if (!isUser(response.data)) {
  throw new Error('Invalid user data');
}
const user = response.data;
```

**Configuration Options**:

- `allowConstAssertions`: When `true`, allows `as const` assertions (default: `true`)
- `allowNonNullAssertions`: When `true`, allows non-null assertions (`!`) (default: `false`)

#### `type-narrowing`

Enforces proper type narrowing patterns in conditional blocks.

**Incorrect** ❌:

```typescript
function processValue(value: string | number) {
  if (value) {
    // ❌ value is still string | number
    console.log(value.toFixed(2));
  }
}
```

**Correct** ✅:

```typescript
function processValue(value: string | number) {
  if (typeof value === 'number') {
    // ✅ value is properly narrowed to number
    console.log(value.toFixed(2));
  } else {
    // ✅ value is string here
    console.log(value.toUpperCase());
  }
}
```

**Configuration Options**:

- `requireTypeGuards`: When `true`, requires explicit type guards for complex types (default: `true`)
- `allowTypePredicates`: When `true`, allows user-defined type guards (default: `true`)

#### `no-any`

Prevents the use of `any` in type definitions to maintain type safety.

**Incorrect** ❌:

```typescript
function parseData(data: any): Data {
  // ...
}

interface Config {
  [key: string]: any;
}
```

**Correct** ✅:

```typescript
function parseData(data: unknown): Data {
  if (!isValidData(data)) {
    throw new Error('Invalid data');
  }
  // ...
}

interface Config {
  [key: string]: string | number | boolean | null | undefined;
}
```

**Configuration Options**:

- `allowExplicitAny`: When `true`, allows explicit `any` types with `// eslint-disable-next-line` (default: `false`)
- `allowInTests`: When `true`, allows `any` in test files (default: `true`)

#### `generic-constraints`

Enforces proper constraints on generic type parameters.

**Incorrect** ❌:

```typescript
function getValue<T>(obj: T, key: string) {
  return obj[key]; // ❌ No constraint on T
}

class Store<T> {
  // ❌ No constraint on T
  setItem(key: string, value: T) {}
}
```

**Correct** ✅:

```typescript
function getValue<T extends object>(obj: T, key: keyof T) {
  return obj[key];
}

class Store<T extends { id: string }> {
  private items: T[] = [];
  
  setItem(item: T) {
    const index = this.items.findIndex(i => i.id === item.id);
    if (index >= 0) {
      this.items[index] = item;
    } else {
      this.items.push(item);
    }
  }
}
```

**Configuration Options**:

- `requireConstraints`: When `true`, requires all generic parameters to have constraints (default: `true`)
- `allowEmptyObject`: When `true`, allows `T extends object` (default: `true`)
- `allowAny`: When `true`, allows `T extends any` (default: `false`)

## Testing (Advanced)

### Integration Tests

- `integration-tests` - Enforce integration tests for component interactions
- `no-implementation-details` - Prevent testing implementation details
- `test-cleanup` - Enforce proper test cleanup
- `no-flaky-tests` - Prevent flaky tests
- `test-isolation` - Enforce proper test isolation

## Code Formatting

### Function Formatting

- `function-braces` - Autofix brackets to functions with or without return
- `arrow-to-function` - Autoconvert const arrow functions to function declarations

## License Management

### Paid License Banner

- `license-banner` - Insert paid advertising banner after 1000 file checks

## Configuration

### TypeScript Config

#### `tsconfig-autofix`

Automatically configures and fixes TypeScript configuration based on project type and requirements, ensuring optimal type checking and module resolution.

**Common Issues Fixed**:

- Missing or incorrect `strict` mode settings
- Improper module resolution
- Missing type definitions
- Incorrect JSX handling
- Outdated or missing compiler options

**Configuration Options**:

```json
{
  "rules": {
    "@vibecoder-rasp/tsconfig-autofix": [
      "error",
      {
        "projectType": "react-app", // 'react-lib', 'node', 'node-lib', 'nextjs', etc.
        "strict": true,             // Enable all strict type checking options
        "jsx": "react-jsx",         // JSX transformation
        "moduleResolution": "node"  // Module resolution strategy
      }
    ]
  }
}
```

**Example Configurations**:

1. **React Application**:

   ```json
   {
     "compilerOptions": {
       "target": "es5",
       "lib": ["dom", "dom.iterable", "esnext"],
       "allowJs": true,
       "skipLibCheck": true,
       "esModuleInterop": true,
       "allowSyntheticDefaultImports": true,
       "strict": true,
       "forceConsistentCasingInFileNames": true,
       "noFallthroughCasesInSwitch": true,
       "module": "esnext",
       "moduleResolution": "node",
       "resolveJsonModule": true,
       "isolatedModules": true,
       "noEmit": true,
       "jsx": "react-jsx"
     },
     "include": ["src"]
   }
   ```

2. **React Library**:

   ```json
   {
     "compilerOptions": {
       "target": "es5",
       "lib": ["dom", "dom.iterable", "esnext"],
       "declaration": true,
       "declarationMap": true,
       "sourceMap": true,
       "outDir": "./dist",
       "strict": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true,
       "module": "esnext",
       "moduleResolution": "node",
       "resolveJsonModule": true,
       "jsx": "react-jsx",
       "rootDir": "./src",
       "composite": true
     },
     "include": ["src"],
     "exclude": ["node_modules", "dist"]
   }
   ```

**Best Practices**:

1. **Enable Strict Mode**:

   ```json
   {
     "compilerOptions": {
       "strict": true,
       "noImplicitAny": true,
       "strictNullChecks": true,
       "strictFunctionTypes": true,
       "strictBindCallApply": true,
       "strictPropertyInitialization": true,
       "noImplicitThis": true,
       "alwaysStrict": true
     }
   }
   ```

2. **Module Resolution**:
   - Use `"moduleResolution": "node"` for Node.js projects
   - Use `"moduleResolution": "bundler"` for bundlers like Vite
   - Use `"moduleResolution": "node16"` for Node.js ESM projects

3. **JSX Handling**:
   - `"jsx": "react-jsx"` for React 17+ with automatic JSX runtime
   - `"jsx": "react"` for manual React import
   - `"jsx": "preserve"` for JSX output without transformation

4. **Type Checking**:
   - Enable `skipLibCheck` for better performance
   - Use `exactOptionalPropertyTypes` for precise optional properties
   - Enable `noUncheckedIndexedAccess` for safer array/object access

5. **Project References**:

   ```json
   {
     "references": [
       { "path": "./packages/core" },
       { "path": "./packages/utils" }
     ]
   }
   ```

**Autofixable Issues**:

- Adding missing compiler options
- Fixing module resolution
- Enabling strict mode
- Updating lib references
- Fixing path aliases

### ESLint Config

#### `eslint-config-autofix`

Automatically configures and fixes ESLint configuration based on project type and requirements, ensuring consistent code style and best practices.

**Features**:

- Auto-detects project type (React, Node.js, etc.)
- Configures appropriate parser and plugins
- Sets up recommended rule sets
- Handles TypeScript and JSX
- Configures environment settings
- Sets up Prettier integration

**Configuration Options**:

```json
{
  "rules": {
    "@vibecoder-rasp/eslint-config-autofix": [
      "error",
      {
        "projectType": "react-app", // 'react-lib', 'node', 'node-lib', 'nextjs', etc.
        "typescript": true,         // Enable TypeScript support
        "react": {
          "version": "detect"       // Auto-detect React version
        },
        "prettier": true,          // Integrate with Prettier
        "jest": true               // Add Jest testing utilities
      }
    ]
  }
}
```

**Example Configurations**:

1. **React Application with TypeScript**:

   ```js
   module.exports = {
     root: true,
     parser: '@typescript-eslint/parser',
     parserOptions: {
       ecmaVersion: 2021,
       sourceType: 'module',
       ecmaFeatures: {
         jsx: true,
       },
       project: './tsconfig.json',
     },
     env: {
       browser: true,
       es2021: true,
       node: true,
     },
     extends: [
       'eslint:recommended',
       'plugin:react/recommended',
       'plugin:react-hooks/recommended',
       'plugin:@typescript-eslint/recommended',
       'plugin:import/errors',
       'plugin:import/warnings',
       'plugin:import/typescript',
       'plugin:jsx-a11y/recommended',
       'plugin:prettier/recommended',
     ],
     plugins: [
       'react',
       '@typescript-eslint',
       'import',
       'jsx-a11y',
       'react-hooks',
       'prettier',
     ],
     rules: {
       // Custom rules here
       'react/prop-types': 'off', // Not needed with TypeScript
       'react/react-in-jsx-scope': 'off', // Not needed with React 17+
       '@typescript-eslint/explicit-module-boundary-types': 'off',
     },
     settings: {
       react: {
         version: 'detect',
       },
       'import/resolver': {
         typescript: {},
         node: {
           extensions: ['.js', '.jsx', '.ts', '.tsx'],
         },
       },
     },
   };
   ```

2. **Node.js Library**:

   ```js
   module.exports = {
     root: true,
     parser: '@typescript-eslint/parser',
     parserOptions: {
       ecmaVersion: 2021,
       sourceType: 'module',
       project: './tsconfig.json',
     },
     env: {
       node: true,
       es2021: true,
     },
     extends: [
       'eslint:recommended',
       'plugin:@typescript-eslint/recommended',
       'plugin:import/errors',
       'plugin:import/warnings',
       'plugin:import/typescript',
       'plugin:node/recommended',
       'plugin:prettier/recommended',
     ],
     plugins: ['@typescript-eslint', 'import', 'node', 'prettier'],
     rules: {
       'node/no-unsupported-features/es-syntax': [
         'error',
         { ignores: ['modules'] },
       ],
     },
     settings: {
       'import/resolver': {
         typescript: {},
         node: {
           extensions: ['.js', '.ts'],
         },
       },
     },
   };
   ```

**Best Practices**:

1. **Performance Optimization**:

   ```js
   // .eslintrc.js
   module.exports = {
     // ...
     parserOptions: {
       // Only parse files that match these patterns
       project: ['**/tsconfig.json', '**/tsconfig.*.json'],
       // Enable caching for better performance
       cache: true,
       // Only run on changed files in watch mode
       cacheLocation: '.eslintcache',
     },
   };
   ```

2. **TypeScript Specific**:

   ```js
   // .eslintrc.js
   module.exports = {
     // ...
     rules: {
       // TypeScript specific rules
       '@typescript-eslint/consistent-type-imports': 'error',
       '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],
       '@typescript-eslint/explicit-function-return-type': 'off',
       '@typescript-eslint/explicit-module-boundary-types': 'off',
     },
   };
   ```

3. **React Specific**:

   ```js
   // .eslintrc.js
   module.exports = {
     // ...
     rules: {
       // React specific rules
       'react-hooks/rules-of-hooks': 'error',
       'react-hooks/exhaustive-deps': 'warn',
       'react/display-name': 'off',
       'react/jsx-uses-react': 'off',
       'react/react-in-jsx-scope': 'off',
     },
   };
   ```

4. **Import Order**:

   ```js
   // .eslintrc.js
   module.exports = {
     // ...
     rules: {
       'import/order': [
         'error',
         {
           groups: [
             'builtin',
             'external',
             'internal',
             'parent',
             'sibling',
             'index',
             'object',
           ],
           'newlines-between': 'always',
           alphabetize: {
             order: 'asc',
             caseInsensitive: true,
           },
         },
       ],
     },
   };
   ```

**Autofixable Issues**:

- Adding missing plugins and extends
- Configuring parser options
- Setting up environment globals
- Configuring TypeScript support
- Setting up React specific rules
- Configuring import/resolver settings
- Enabling recommended rule sets

## Internationalization (i18n)

### Translation

#### `require-translations`

Enforces the use of translation functions for all user-facing strings, ensuring consistent internationalization.

**Incorrect** ❌:

```tsx
// Hardcoded strings in JSX
const Greeting = () => <h1>Hello, World!</h1>;

// Direct string concatenation
const Welcome = ({ name }) => <p>Welcome back, {name}!</p>;
```

**Correct** ✅:

```tsx
// Using translation functions
import { t } from 'i18next';

const Greeting = () => <h1>{t('greeting.hello')}</h1>;

// With dynamic values
const Welcome = ({ name }) => <p>{t('greeting.welcome', { name })}</p>;

// Translation files (e.g., en.json)
{
  "greeting": {
    "hello": "Hello, World!",
    "welcome": "Welcome back, {{name}}!"
  }
}
```

**Configuration Options**:

- `translationFunctions`: Array of translation function names (default: `['t', 'i18n.t']`)
- `ignorePatterns`: Array of regex patterns to ignore (e.g., `['^test', 'mock']`)
- `ignoreAttributes`: Array of JSX attributes to ignore (default: `['key', 'className', 'id']`)
- `enforceInJSX`: Whether to enforce in JSX (default: true)

#### `no-hardcoded-strings`

Prevents hardcoded strings in JSX to ensure all text is internationalized.

**Incorrect** ❌:

```tsx
function Button() {
  return <button>Click me</button>;
}

function Form() {
  return (
    <form>
      <label>Username: <input type="text" /></label>
      <button type="submit">Submit</button>
    </form>
  );
}
```

**Correct** ✅:

```tsx
function Button() {
  return <button>{t('button.submit')}</button>;
}

function Form() {
  return (
    <form>
      <label>
        {t('form.labels.username')}
        <input type="text" />
      </label>
      <button type="submit">{t('button.submit')}</button>
    </form>
  );
}
```

**Configuration Options**:

- `allowedStrings`: Array of allowed strings (e.g., `['-', ':', '|']`)
- `ignorePatterns`: Array of regex patterns to ignore
- `ignoreJSXText`: Whether to ignore text directly in JSX (default: false)
- `ignoreAttributes`: Array of JSX attributes to ignore (default: `['alt', 'title', 'aria-label']`)

#### `translation-keys`

Enforces consistent naming conventions for translation keys.

**Incorrect** ❌:

```tsx
// Inconsistent key naming
t('welcomeMessage');
t('user_welcome');
t('UserGreeting');
```

**Correct** ✅:

```tsx
// Consistent dot notation, kebab-case
t('welcome.message');
t('user.welcome');
t('user.greeting');
```

**Configuration Options**:

- `namingPattern`: Regex pattern for key names (default: `^[a-z0-9]+(\.[a-z0-9]+)*$`)
- `maxLength`: Maximum key length (default: 50)
- `ignorePatterns`: Array of regex patterns to ignore
- `allowNested`: Whether to allow nested keys (default: true)

#### `no-missing-translations`

Prevents using translation keys that don't exist in the translation files.

**Incorrect** ❌:

```tsx
// Missing translation key
t('nonexistent.key');

// Missing nested key
t('existing.parent.nonexistent');
```

**Correct** ✅:

```tsx
// Existing key
t('existing.key');

// With fallback
t('missing.key', 'Default text');
```

**Configuration Options**:

- `translationFiles`: Glob pattern to translation files (default: `'**/locales/*.json'`)
- `defaultLocale`: Default locale (default: `'en'`)
- `ignoreMissing`: Whether to ignore missing translations (default: false)
- `requireDescription`: Whether to require descriptions for translations (default: false)

### Best Practices

1. **Use namespaced keys**: Organize translations by feature or component

   ```tsx
   // Good
   t('user.profile.name');
   t('user.profile.email');
   
   // Avoid
   t('name');
   t('userEmail');
   ```

2. **Keep keys short but descriptive**:

   ```tsx
   // Good
   t('user.actions.delete');
   
   // Too verbose
   t('buttonToDeleteTheSelectedUserFromTheSystem');
   ```

3. **Handle plurals properly**:

   ```tsx
   // Using i18next's plural handling
   t('item.count', { count: items.length });
   
   // In translation files
   {
     "item": {
       "count_one": "{{count}} item",
       "count_other": "{{count}} items"
     }
   }
   ```

4. **Use template literals for dynamic keys**:

   ```tsx
   // Good
   const status = 'pending';
   t(`status.${status}`);
   
   // Avoid string concatenation
   t('status.' + status); // Harder to extract
   ```

## Code Style

### Code Duplication

#### `no-duplicate-code`

Detects and prevents code duplication across your codebase, helping maintain DRY (Don't Repeat Yourself) principles.

**Incorrect** ❌:

```tsx
// Duplicated calculation logic
const totalA = itemsA.reduce((sum, item) => sum + item.price * item.quantity, 0);
const totalB = itemsB.reduce((sum, item) => sum + item.price * item.quantity, 0);

// Duplicated component logic
const UserCardA = ({ user }) => (
  <div className="card">
    <h3>{user.name}</h3>
    <p>{user.bio}</p>
  </div>
);

const UserCardB = ({ user }) => (
  <div className="card">
    <h3>{user.name}</h3>
    <p>{user.bio}</p>
  </div>
);
```

**Correct** ✅:

```tsx
// Extract reusable function
const calculateTotal = (items) => 
  items.reduce((sum, item) => sum + item.price * item.quantity, 0);

const totalA = calculateTotal(itemsA);
const totalB = calculateTotal(itemsB);

// Reuse component
const UserCard = ({ user }) => (
  <div className="card">
    <h3>{user.name}</h3>
    <p>{user.bio}</p>
  </div>
);
```

**Configuration Options**:

- `minTokens`: Minimum number of tokens to consider as a duplicate (default: 30)
- `ignorePatterns`: Array of patterns to ignore (e.g., `["test/*"]`)
- `ignoreStrings`: Whether to ignore string literals (default: true)

### Control Flow

#### `curly-braces`

Requires curly braces for all control statements, improving code readability and preventing potential bugs.

**Incorrect** ❌:

```tsx
// Missing curly braces
if (condition) doSomething();

// Inconsistent formatting
if (condition) {
  doSomething();
} else doSomethingElse();
```

**Correct** ✅:

```tsx
// Always use curly braces
if (condition) {
  doSomething();
}

// Consistent with all control statements
if (condition) {
  doSomething();
} else {
  doSomethingElse();
}

// Single line is also acceptable with proper formatting
if (condition) { doSomething(); }
```

**Configuration Options**:

- `allowSingleLine`: Allow single-line blocks without newlines (default: false)
- `allowNested`: Allow omitting braces in nested control structures (default: false)

#### `switch-case-formatting`

Enforces consistent formatting for switch-case statements, including required curly braces and proper indentation.

**Incorrect** ❌:

```tsx
// Missing curly braces
switch (value) {
  case 1: 
    doSomething();
    break;
  case 2: 
    doSomethingElse();
    break;
}

// Inconsistent indentation
switch (value) {
  case 1: {
    doSomething();
    break;
  }
  case 2: {
  doSomethingElse();
    break;
  }
}
```

**Correct** ✅:

```tsx
// Properly formatted with consistent indentation
switch (value) {
  case 1: {
    doSomething();
    break;
  }
  case 2: {
    doSomethingElse();
    break;
  }
  default: {
    handleDefault();
  }
}

// Single-line case is also acceptable
switch (value) {
  case 1: { doSomething(); break; }
  case 2: { doSomethingElse(); break; }
  default: { handleDefault(); }
}
```

**Configuration Options**:

- `requireBraces`: Whether to require curly braces (default: true)
- `allowSingleLine`: Allow single-line case blocks (default: true)
- `enforceDefault`: Whether to require a default case (default: true)

## Configuration Options

Each rule can be configured with the following common options:

- `severity` - Can be "off", "warn", or "error"
- `ignorePatterns` - Array of regex patterns to ignore
- `autofix` - Whether to enable autofix (default: true)

## Rule Dependencies

Some rules depend on others for best results. For example:

- `require-memo` works best with `no-inline-functions`
- `explicit-prop-types` works best with `require-default-props`
- `proper-dependency-arrays` works best with `stable-dependencies`

## Recommended Config

```json
{
  "extends": [
    "plugin:@typescript-eslint/recommended",
    "plugin:react/recommended",
    "plugin:react-hooks/recommended",
    "plugin:jsx-a11y/recommended"
  ],
  "plugins": ["@vibecoder-rasp"],
  "rules": {
    // State Management
    "@vibecoder-rasp/state-colocation": "error",
    "@vibecoder-rasp/no-prop-drilling": ["error", { "maxDepth": 3 }],
    "@vibecoder-rasp/derived-state-memo": "error",
    "@vibecoder-rasp/no-state-mutation": "error",
    
    // TypeScript
    "@vibecoder-rasp/strict-null-checks": "error",
    "@vibecoder-rasp/no-non-null-assertion": "error",
    "@vibecoder-rasp/explicit-undefined": "error",
    "@vibecoder-rasp/explicit-function-return-type": ["error", { "allowExpressions": true }],
    
    // Performance
    "@vibecoder-rasp/require-memo": "warn",
    "@vibecoder-rasp/no-inline-functions": "warn",
    
    // Accessibility
    "@vibecoder-rasp/require-alt-text": "error",
    "@vibecoder-rasp/keyboard-accessibility": "error"
  }
}
```

## Versioning

Rules follow semantic versioning. Breaking changes will be accompanied by a major version bump.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Add tests for your changes
4. Run `npm test`
5. Submit a pull request

## License

MIT
