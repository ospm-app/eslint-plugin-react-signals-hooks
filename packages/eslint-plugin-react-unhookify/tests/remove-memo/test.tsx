import React, { memo } from 'react';

// This should be flagged and fixed
const MemoizedComponent = React.memo(() => {
  return <div>Hello World</div>;
});

// This should also be flagged and fixed
const MemoizedComponent2 = React.memo(function() {
  return <div>Hello Again</div>;
});

// This should be flagged and fixed (with props)
interface Props {
  name: string;
}

const MemoizedComponent3 = React.memo<Props>(({ name }) => {
  return <div>Hello {name}</div>;
});

// This should be flagged and fixed (direct memo)
const MemoizedComponent4 = memo(() => {
  return <div>Direct Memo</div>;
});

// This should not be flagged (not memo)
const RegularComponent = () => {
  return <div>Regular Component</div>;
};

// This should not be flagged (wrong signature - no arguments)
const notMemo = React.memo(() => null); // Add component to make it valid

// This should be flagged and fixed (arrow function)
const MemoizedComponent5 = React.memo(() => <div>JSX</div>);
