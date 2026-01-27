import React, { useMemo, useCallback, memo } from 'react';

// Example 1: Before - Unnecessary memoization in a simple component
const UserProfile = memo(({ userId }: { userId: string }) => {
  // ❌ Unnecessary useMemo - simple calculation
  const displayName = useMemo(() => {
    return userId.split('@')[0];
  }, [userId]);

  // ❌ Unnecessary useCallback - simple function
  const handleClick = useCallback(() => {
    console.log(`User ${displayName} clicked`);
  }, [displayName]);

  return (
    <div>
      <h2>{displayName}</h2>
      <button onClick={handleClick}>Click me</button>
    </div>
  );
});

// Example 2: After - Clean, simplified component
const UserProfileClean = ({ userId }: { userId: string }) => {
  // ✅ Direct computation - simple and readable
  const displayName = userId.split('@')[0];

  // ✅ Direct function - no unnecessary memoization
  const handleClick = () => {
    console.log(`User ${displayName} clicked`);
  };

  return (
    <div>
      <h2>{displayName}</h2>
      <button onClick={handleClick}>Click me</button>
    </div>
  );
};

// Example 3: When to keep memoization (performance-critical)
const ExpensiveComponent = ({ data }: { data: any[] }) => {
  // ✅ Keep this - expensive computation
  const processedData = useMemo(() => {
    return data.reduce((acc, item) => {
      // Complex processing logic
      return acc + item.value;
    }, 0);
  }, [data]);

  // ✅ Keep this - function passed to many children
  const handleItemClick = useCallback((itemId: string) => {
    // Complex event handling
    console.log(`Item ${itemId} clicked`);
  }, []);

  return (
    <div>
      <p>Total: {processedData}</p>
      {data.map(item => (
        <Item key={item.id} item={item} onClick={handleItemClick} />
      ))}
    </div>
  );
};

const Item = memo(({ item, onClick }: { item: any; onClick: (id: string) => void }) => {
  return (
    <div onClick={() => onClick(item.id)}>
      {item.name}
    </div>
  );
});

// Example 4: Complex component that benefits from memoization
const ComplexForm = memo(({ onSubmit, initialValues }: { 
  onSubmit: (values: any) => void;
  initialValues: any;
}) => {
  // ✅ Keep memoization for complex validation logic
  const validateForm = useCallback((values: any) => {
    const errors = [];
    if (!values.email) errors.push('Email required');
    if (!values.password) errors.push('Password required');
    if (values.password.length < 8) errors.push('Password too short');
    return errors;
  }, []);

  // ✅ Keep memoization for expensive formatting
  const formattedData = useMemo(() => {
    return {
      ...initialValues,
      createdAt: new Date(initialValues.createdAt).toLocaleDateString(),
      amount: new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
      }).format(initialValues.amount)
    };
  }, [initialValues]);

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      const formData = new FormData(e.currentTarget);
      const values = Object.fromEntries(formData.entries());
      const errors = validateForm(values);
      if (errors.length === 0) {
        onSubmit(values);
      }
    }}>
      {/* Form fields */}
    </form>
  );
});

// Example 5: Hook with memoization (when to keep)
const useExpensiveHook = (data: any[]) => {
  // ✅ Keep memoization for expensive calculations in hooks
  const expensiveValue = useMemo(() => {
    return data.reduce((acc, item) => {
      // Complex calculation
      return acc + item.expensiveCalculation();
    }, 0);
  }, [data]);

  // ✅ Keep memoization for stable function references
  const stableCallback = useCallback((id: string) => {
    console.log(`Processing ${id} with value ${expensiveValue}`);
  }, [expensiveValue]);

  return { expensiveValue, stableCallback };
};
