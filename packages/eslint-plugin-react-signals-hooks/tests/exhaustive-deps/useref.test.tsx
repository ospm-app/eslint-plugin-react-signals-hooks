import { type JSX, useEffect, useRef } from 'react';
import { Text, View } from 'react-native';

export function TestUseRefComponent(): JSX.Element {
  const ref = useRef<View | null>(null);

  const stableRef = useRef(42);

  // This should NOT require 'ref' as a dependency since useRef values are stable
  useEffect(() => {
    if (ref.current) {
      console.info('Element found:', ref.current);
    }
  }, []); // Should be valid - no dependency needed for ref

  // This should also NOT require 'stableRef' as a dependency
  useEffect(() => {
    console.info('Stable value:', stableRef.current);

    stableRef.current = 100; // Mutating ref is fine
  }, []); // Should be valid - no dependency needed for stableRef

  return (
    <View ref={ref}>
      <Text>Test component</Text>
    </View>
  );
}
