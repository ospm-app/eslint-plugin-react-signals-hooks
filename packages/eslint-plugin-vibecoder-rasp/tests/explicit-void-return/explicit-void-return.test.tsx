/** biome-ignore-all lint/suspicious/noExplicitAny: not relevant */
import type { JSX } from 'react';

// Bad: Function declaration without return type
// This should trigger the rule
export function FunctionWithoutReturnType() {
  console.info('This function has no return type');
}

// Bad: Arrow function with block body without return type
// This should trigger the rule
export const ArrowFunctionWithoutReturnType = () => {
  console.info('This arrow function has no return type');
};

// Bad: Class method without return type
// This should trigger the rule
export class ExampleClass {
  methodWithoutReturnType() {
    console.info('This method has no return type');
  }
}

// Good: Function with explicit void return type
// This should pass the rule
export function FunctionWithVoidReturn(): void {
  console.info('This function has a void return type');
}

// Good: Arrow function with explicit void return type
export const ArrowFunctionWithVoidReturn = (): void => {
  console.info('This arrow function has a void return type');
};

// Good: Class method with explicit void return type
export class ExampleClassWithTypes {
  methodWithVoidReturn(): void {
    console.info('This method has a void return type');
  }
}

// Good: Function with non-void return type
export function add(a: number, b: number): number {
  return a + b;
}

// Good: Arrow function with implicit return
// This should pass as it has an implicit return
export const multiply = (a: number, b: number) => a * b;

// Edge case: React functional component with JSX return
export function ReactComponent(): JSX.Element {
  return <div>Hello, world!</div>;
}

// Edge case: Function that returns a promise
export async function fetchData(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 1000));
  console.info('Data fetched');
}

// Edge case: Function with explicit undefined return
export function noop(): undefined {
  return undefined;
}

// Edge case: Function with never return type
export function throwError(message: string): never {
  throw new Error(message);
}

// Edge case: Function with union return type
export function getValue(flag: boolean): string | number {
  return flag ? 'string' : 42;
}

// Edge case: Generic function
export function identity<T>(value: T): T {
  return value;
}

// Edge case: Function with rest parameters
export function logAll(...args: string[]): void {
  console.info(args.join(', '));
}

// Edge case: Function with optional parameters
export function greet(name: string, greeting?: string): string {
  return `${greeting || 'Hello'}, ${name}!`;
}

// Edge case: Function with default parameters
export function createUser(
  name: string,
  isAdmin: boolean = false
): { name: string; isAdmin: boolean } {
  return { name, isAdmin };
}

// Edge case: Function with destructured parameters
export function formatUser({ name, age }: { name: string; age: number }): string {
  return `${name} (${age} years old)`;
}

// Edge case: Function with this parameter
export function boundFunction(this: { value: number }): number {
  return this.value;
}

// Edge case: Function with overloads
export function getLength(value: string): number;
export function getLength(value: Array<any>): number;
export function getLength(value: string | Array<any>): number {
  return value.length;
}

// Edge case: Function with type guard
export function isString(value: any): value is string {
  return typeof value === 'string';
}

// Edge case: Function with assertion
export function assert(condition: any, message: string): asserts condition {
  if (!condition) throw new Error(message);
}
