import { useState, useMemo, type JSX } from 'react';

// Bad: Derived state without memoization
// This should trigger the rule
export function UnmemoizedDerivedState(): JSX.Element {
  const [items] = useState([1, 2, 3, 4, 5]);

  // Bad: Derived value not memoized
  const total = items.reduce((sum, item) => sum + item, 0);

  return <div>Total: {total}</div>;
}

// Good: Derived state with useMemo
// This should pass the rule
export function MemoizedDerivedState(): JSX.Element {
  const [items] = useState([1, 2, 3, 4, 5]);

  // Good: Derived value is memoized
  const total = useMemo(() => {
    return items.reduce((sum, item) => sum + item, 0);
  }, [items]);

  return <div>Total: {total}</div>;
}

// Component with multiple derived values
// Some memoized, some not
export function MixedDerivedState(): JSX.Element {
  const [user] = useState({ firstName: 'John', lastName: 'Doe', age: 30 });

  // Bad: Not memoized
  const fullName = `${user.firstName} ${user.lastName}`;

  // Good: Memoized
  const isAdult = useMemo(() => {
    return user.age >= 18;
  }, [user.age]);

  // Bad: Complex calculation not memoized
  const userInfo = {
    name: fullName,
    isAdult,
    status: isAdult ? 'Adult' : 'Minor',
  };

  return (
    <div>
      <div>Name: {fullName}</div>

      <div>Status: {userInfo.status}</div>
    </div>
  );
}

// Component with properly memoized derived state
export function ProperlyMemoizedComponent(): JSX.Element {
  const [todos] = useState([
    { id: 1, text: 'Learn React', completed: true },
    { id: 2, text: 'Build something', completed: false },
    { id: 3, text: 'Deploy', completed: false },
  ]);

  // Good: Memoized derived state
  const completedCount = useMemo(() => {
    return todos.filter((todo) => todo.completed).length;
  }, [todos]);

  // Good: Memoized derived object
  const todoStats = useMemo(
    () => ({
      total: todos.length,
      completed: completedCount,
      remaining: todos.length - completedCount,
      percentComplete: Math.round((completedCount / todos.length) * 100) || 0,
    }),
    [todos, completedCount]
  );

  return (
    <div>
      <div>Total: {todoStats.total}</div>

      <div>Completed: {todoStats.completed}</div>

      <div>Remaining: {todoStats.remaining}</div>

      <div>Progress: {todoStats.percentComplete}%</div>
    </div>
  );
}

// Component with conditional rendering based on derived state
export function ConditionalRendering(): JSX.Element {
  const [filters, setFilters] = useState({
    showCompleted: true,
    searchQuery: '',
  });

  const [todos] = useState([
    { id: 1, text: 'Learn React', completed: true },
    { id: 2, text: 'Build something', completed: false },
    { id: 3, text: 'Deploy', completed: false },
  ]);

  // Good: Memoized filtered todos
  const filteredTodos = useMemo(() => {
    return todos.filter((todo) => {
      const matchesSearch = todo.text.toLowerCase().includes(filters.searchQuery.toLowerCase());
      const matchesFilter = filters.showCompleted ? true : !todo.completed;
      return matchesSearch && matchesFilter;
    });
  }, [todos, filters.showCompleted, filters.searchQuery]);

  return (
    <div>
      <input
        type='text'
        placeholder='Search todos...'
        value={filters.searchQuery}
        onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
      />

      <label>
        <input
          type='checkbox'
          checked={filters.showCompleted}
          onChange={(e) => setFilters((prev) => ({ ...prev, showCompleted: e.target.checked }))}
        />
        Show completed
      </label>

      <ul>
        {filteredTodos.map((todo) => (
          <li key={todo.id}>
            {todo.text} {todo.completed ? '✓' : ''}
          </li>
        ))}
      </ul>
    </div>
  );
}

// Test configuration for custom options
export const customOptionsConfig = {
  rules: {
    'vibecoder-rasp/derived-state-memo': [
      'error',
      {
        // Only warn for calculations with more than 2 operations
        minOperations: 2,
        // Ignore simple string concatenations
        ignoreSimpleConcat: true,
        // Ignore simple property access
        ignoreSimplePropertyAccess: true,
      },
    ],
  },
};

// Component that would pass with custom options
export function ComponentWithSimpleDerivations(): JSX.Element {
  const [user] = useState({ firstName: 'John', lastName: 'Doe' });

  // Would be allowed with ignoreSimpleConcat: true
  const fullName = `${user.firstName} ${user.lastName}`;

  // Would be allowed with ignoreSimplePropertyAccess: true
  const firstName = user.firstName;

  // Would trigger the rule (more than 2 operations)
  const formattedName = `${user.firstName.toUpperCase()} ${user.lastName.toLowerCase()}`;

  return (
    <div>
      <div>Full Name: {fullName}</div>

      <div>First Name: {firstName}</div>

      <div>Formatted: {formattedName}</div>
    </div>
  );
}
