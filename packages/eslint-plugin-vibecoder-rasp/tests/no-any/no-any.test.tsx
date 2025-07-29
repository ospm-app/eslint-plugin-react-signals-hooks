/** biome-ignore-all lint/suspicious/noExplicitAny: not relevant */
import { type ChangeEvent, useEffect, useState, type JSX } from 'react';

// ===== INCORRECT PATTERNS =====

// 1. Component with any type in props
// This should trigger the rule
export function AnyPropsComponent(): JSX.Element {
  const [data, setData] = useState<any>({ name: 'John' });

  const handleClick = (): void => {
    // This is bad - using any type in state
    setData({ ...data, age: 30 });
  };

  return (
    <div>
      <button type='button' onClick={handleClick}>
        Update Age
      </button>
      <DisplayData data={data} />
    </div>
  );
}

function DisplayData({ data }: { data: any }): JSX.Element {
  // This is bad - using any type in props
  return (
    <div>
      <p>Name: {data.name}</p>
      <p>Age: {data.age || 'Not set'}</p>
    </div>
  );
}

// 2. Component with any in event handlers
export function AnyEventHandler(): JSX.Element {
  const handleChange = (event: any): void => {
    // This is bad - using any for event type
    console.info(event.target.value);
  };

  return <input type='text' onChange={handleChange} />;
}

// 3. Component with any in state
export function AnyStateComponent(): JSX.Element {
  const [state, setState] = useState<any>({ count: 0 });

  const increment = (): void => {
    // This is bad - using any in state
    setState({ count: (state.count as number) + 1 });
  };

  return (
    <div>
      <p>Count: {state.count}</p>
      <button type='button' onClick={increment}>
        Increment
      </button>
    </div>
  );
}

// ===== CORRECT PATTERNS =====

// 1. Properly typed component props
interface UserData {
  id: number;
  name: string;
  email: string;
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

export function TypedPropsComponent(): JSX.Element {
  const [user, _setUser] = useState<UserData>({
    id: 1,
    name: 'John Doe',
    email: 'john@example.com',
    preferences: {
      theme: 'light',
      notifications: true,
    },
  });

  return (
    <div>
      <h2>User Profile</h2>

      <UserProfile user={user} />
    </div>
  );
}

function UserProfile({ user }: { user: UserData }): JSX.Element {
  return (
    <div>
      <p>Name: {user.name}</p>

      <p>Email: {user.email}</p>

      <p>Theme: {user.preferences.theme}</p>
    </div>
  );
}

// 2. Properly typed event handlers
export function TypedEventHandler(): JSX.Element {
  const [value, setValue] = useState('');

  const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
    setValue(event.target.value);
  };

  return (
    <div>
      <input type='text' value={value} onChange={handleChange} placeholder='Type something...' />
      <p>You typed: {value}</p>
    </div>
  );
}

// 3. Using generics with components
export function GenericList<T extends { id: string | number }>({
  items,
  renderItem,
}: {
  items: T[];
  renderItem: (item: T) => JSX.Element;
}): JSX.Element {
  return (
    <ul>
      {items.map((item) => (
        <li key={item.id}>{renderItem(item)}</li>
      ))}
    </ul>
  );
}

export function UserList(): JSX.Element {
  const users = [
    { id: 1, name: 'Alice' },
    { id: 2, name: 'Bob' },
    { id: 3, name: 'Charlie' },
  ];

  return (
    <div>
      <h3>User List</h3>
      <GenericList
        items={users}
        renderItem={(user) => (
          <div>
            <span>{user.id}. </span>
            <strong>{user.name}</strong>
          </div>
        )}
      />
    </div>
  );
}

// 4. Using type guards
interface AdminUser {
  role: 'admin';
  permissions: string[];
}

interface RegularUser {
  role: 'user';
  lastLogin: Date;
}

type User = (AdminUser | RegularUser) & {
  id: number;
  name: string;
};

export function UserProfileComponent({ user }: { user: User }): JSX.Element {
  const isAdmin = user.role === 'admin';

  return (
    <div>
      <h3>{user.name}</h3>
      <p>Role: {user.role}</p>

      {isAdmin ? (
        <div>
          <h4>Admin Permissions</h4>
          <ul>
            {user.permissions.map((permission, index) => (
              // biome-ignore lint/suspicious/noArrayIndexKey: not relevant
              <li key={index}>{permission}</li>
            ))}
          </ul>
        </div>
      ) : (
        <p>Last login: {user.lastLogin.toLocaleDateString()}</p>
      )}
    </div>
  );
}

// 5. Using type assertions safely
export function SafeTypeAssertion(): JSX.Element {
  const [data, setData] = useState<unknown>(null);

  // Simulate data fetch
  useEffect(() => {
    // In a real app, this would be an API call
    const fetchData = async (): Promise<void> => {
      const response = { id: 1, name: 'Test User' };
      setData(response);
    };

    void fetchData();
  }, []);

  if (!data) {
    return <div>Loading...</div>;
  }

  // Type assertion with runtime check
  if (typeof data === 'object' && data !== null && 'name' in data) {
    const userData = data as { id: number; name: string };
    return (
      <div>
        <h3>User Profile</h3>
        <p>ID: {userData.id}</p>
        <p>Name: {userData.name}</p>
      </div>
    );
  }

  return <div>Invalid user data</div>;
}
