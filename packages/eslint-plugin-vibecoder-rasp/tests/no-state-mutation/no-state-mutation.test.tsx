import { useState, type JSX } from 'react';

// Bad: Direct state mutation
// This should trigger the rule
export function DirectStateMutation(): JSX.Element {
  const [user, setUser] = useState({ name: 'John', age: 30 });

  const handleBirthday = () => {
    // Bad: Directly mutating state
    user.age += 1;
    setUser(user); // This won't trigger a re-render

    // This would work but still mutates the original state
    // setUser({ ...user, age: user.age + 1 });
  };

  return (
    <div>
      <div>Name: {user.name}</div>

      <div>Age: {user.age}</div>

      <button type='button' onClick={handleBirthday}>
        Celebrate Birthday
      </button>
    </div>
  );
}

// Good: Immutable state update
// This should pass the rule
export function ImmutableStateUpdate(): JSX.Element {
  const [user, setUser] = useState({ name: 'John', age: 30 });

  const handleBirthday = () => {
    // Good: Creating a new object
    setUser((prevUser) => {
      return {
        ...prevUser,
        age: prevUser.age + 1,
      };
    });
  };

  return (
    <div>
      <div>Name: {user.name}</div>

      <div>Age: {user.age}</div>

      <button type='button' onClick={handleBirthday}>
        Celebrate Birthday
      </button>
    </div>
  );
}

// Bad: Nested state mutation
export function NestedStateMutation(): JSX.Element {
  const [todos, setTodos] = useState([
    { id: 1, text: 'Learn React', completed: false },
    { id: 2, text: 'Build something', completed: false },
  ]);

  const toggleTodo = (id: number) => {
    // Bad: Directly mutating nested state
    const todo = todos.find((t) => t.id === id);
    if (todo) {
      todo.completed = !todo.completed;
      setTodos([...todos]);
    }
  };

  return (
    <ul>
      {todos.map(
        (todo): JSX.Element => (
          <li key={todo.id}>
            <input type='checkbox' checked={todo.completed} onChange={() => toggleTodo(todo.id)} />
            {todo.text}
          </li>
        )
      )}
    </ul>
  );
}

// Good: Immutable nested state update
export function ImmutableNestedState(): JSX.Element {
  type State = { id: number; text: string; completed: boolean };

  const [todos, setTodos] = useState<Array<State>>([
    { id: 1, text: 'Learn React', completed: false },
    { id: 2, text: 'Build something', completed: false },
  ]);

  const toggleTodo = (id: number): void => {
    // Good: Creating new array and objects
    setTodos((prevTodos) => {
      return prevTodos.map((todo) => {
        return todo.id === id ? { ...todo, completed: !todo.completed } : todo;
      });
    });
  };

  return (
    <ul>
      {todos.map(
        (todo: { id: number; text: string; completed: boolean }): JSX.Element => (
          <li key={todo.id}>
            <input
              type='checkbox'
              checked={todo.completed}
              onChange={() => {
                return toggleTodo(todo.id);
              }}
            />
            {todo.text}
          </li>
        )
      )}
    </ul>
  );
}

// Complex state with nested objects
export function ComplexState(): JSX.Element {
  const [state, setState] = useState({
    user: {
      name: 'John',
      preferences: {
        theme: 'light',
        notifications: true,
      },
    },
    todos: [],
    loading: false,
  });

  const toggleTheme = (): void => {
    // Bad: Nested state mutation
    // state.user.preferences.theme = state.user.preferences.theme === 'light' ? 'dark' : 'light';
    // setState({ ...state });

    // Good: Deep immutable update
    setState((prevState) => {
      return {
        ...prevState,
        user: {
          ...prevState.user,
          preferences: {
            ...prevState.user.preferences,
            theme: prevState.user.preferences.theme === 'light' ? 'dark' : 'light',
          },
        },
      };
    });
  };

  return (
    <div className={state.user.preferences.theme}>
      <h1>Hello, {state.user.name}!</h1>

      <button type='button' onClick={toggleTheme}>
        Toggle Theme (Current: {state.user.preferences.theme})
      </button>
    </div>
  );
}

// Test configuration for custom options
export const customOptionsConfig = {
  rules: {
    'vibecoder-rasp/no-state-mutation': [
      'error',
      {
        // Allow direct property assignment (still not recommended but configurable)
        allowPropertyAssignment: false,
        // Ignore certain property names
        ignoreProperties: ['current'],
        // Ignore certain variable names (like refs)
        ignoreVariableNames: ['ref$', 'mutableRef'],
      },
    ],
  },
};

// Component with refs that should be ignored by the rule
export function ComponentWithRefs(): JSX.Element {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const [value, setValue] = useState('');

  const handleClick = () => {
    // This is okay because refs are meant to be mutable
    if (inputRef.current) {
      inputRef.current.focus();
      inputRef.current.value = 'Updated'; // This is fine for refs
    }
  };

  return (
    <div>
      <input ref={inputRef} value={value} onChange={(e) => setValue(e.target.value)} />

      <button type='button' onClick={handleClick}>
        Focus Input
      </button>
    </div>
  );
}

// Component with class properties (not state)
export function ComponentWithClassProperties(): JSX.Element {
  // Class property, not React state
  const counter = { value: 0 };
  const [renderCount, setRenderCount] = useState(0);

  function increment(): void {
    // This is fine because it's not React state
    counter.value += 1;
    setRenderCount((prev) => prev + 1);
  }

  return (
    <div>
      <div>Counter: {counter.value}</div>

      <div>Renders: {renderCount}</div>

      <button type='button' onClick={increment}>
        Increment
      </button>
    </div>
  );
}
