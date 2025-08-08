/** biome-ignore-all lint/correctness/useExhaustiveDependencies: these files validate the rule behavior */
/** biome-ignore-all assist/source/organizeImports: off */
import type { JSX, RefObject, MutableRefObject } from 'react';
import { useCallback, useEffect } from 'react';
import { View, Text } from 'react-native';

// Refs passed as props should NOT be required as dependencies.
// `.current` is mutable and the ref object identity is stable.

type RefProps = {
  viewRef: RefObject<View>;
};

export function UseRefPropEffect({ viewRef }: RefProps): JSX.Element {
  // Correct: should NOT require 'viewRef' nor 'viewRef.current'
  useEffect(() => {
    if (viewRef.current) {
      console.info('Element found:', viewRef.current);
    }
  }, []);

  return <View ref={viewRef} />;
}

type MutableRefProps = {
  numRef: MutableRefObject<number>;
};

export function MutableRefPropCallback({ numRef }: MutableRefProps): JSX.Element {
  // Correct: should NOT require 'numRef' nor 'numRef.current'
  const inc = useCallback(() => {
    numRef.current += 1; // mutating ref is fine
  }, []);

  useEffect(() => {
    inc();
  }, [inc]);

  return <Text>{numRef.current}</Text>;
}

// Bare RefObject identifier used/passed should not be required either
export function PassRefProp({ viewRef }: RefProps): JSX.Element {
  function consumeRef(ref: RefObject<View>): void {
    // noop
    void ref;
  }

  // Correct: passing ref object should not require it in deps
  useEffect(() => {
    consumeRef(viewRef);
  }, []);

  return <View ref={viewRef} />;
}

// Optional chaining usage should be ignored as well
export function OptionalChainingRef({ viewRef }: RefProps): JSX.Element {
  useEffect(() => {
    // Correct: should NOT require 'viewRef' nor 'viewRef.current'
    console.info(viewRef?.current);
  }, []);

  return <View ref={viewRef} />;
}

// Non-Ref typed prop should still be treated as a normal dependency
// and deep property access should be required.

type NonRefLike = { current: number };

type NonRefProps = { something: NonRefLike };

export function NonRefPropShouldWarn({ something }: NonRefProps): JSX.Element {
  // Incorrect: should warn missing 'something.current'
  useEffect(() => {
    console.info(something.current);
  }, []);

  // Incorrect: should warn unnecessary 'something' (needs 'something.current' instead)
  const v = useCallback(() => {
    return something.current;
  }, [something]);

  void v;

  return <Text>{something.current}</Text>;
}
