/** biome-ignore-all lint/a11y/useButtonType: relevant, but exhaustive */
/** biome-ignore-all lint/a11y/useValidAnchor: object of tests */
/** biome-ignore-all lint/style/useImportType: false positive */
import type { ReactNode, JSX } from 'react';

// ===== INCORRECT PATTERNS ===== d

// 1. Button without type attribute
// This should trigger the rule
export function ButtonWithoutType(): JSX.Element {
  return (
    <div>
      <button type='button'>Click me</button>
      <button>Submit</button>
      <button>Reset</button>
    </div>
  );
}

// 2. Button with empty type attribute
// This should trigger the rule
export function ButtonWithEmptyType(): JSX.Element {
  return (
    <div>
      {/* @ts-expect-error */}
      <button type=''>Save</button>
      {/* @ts-expect-error */}
      <button type=' '>Cancel</button>
    </div>
  );
}

// 3. Button with spread props but no type
// This should trigger the rule
export function ButtonWithSpreadProps(): JSX.Element {
  const buttonProps = {
    // Missing type property
    onClick: () => console.info('clicked'),
  };

  return <button {...buttonProps}>Click me</button>;
}

// 4. Multiple buttons without types
// This should trigger multiple errors
export function MultipleButtonsWithoutTypes(): JSX.Element {
  return (
    <div>
      <button>First</button>
      <button>Second</button>
      <button>Third</button>
    </div>
  );
}

// ===== CORRECT PATTERNS =====

// 1. Buttons with explicit types
// This should pass the rule
export function ButtonsWithExplicitTypes(): JSX.Element {
  return (
    <div>
      <button type='button'>Click me</button>
      <button type='submit'>Submit Form</button>
      <button type='reset'>Reset Form</button>
    </div>
  );
}

// 2. Self-closing button with type
// This should pass the rule
export function SelfClosingButton(): JSX.Element {
  return <button type='button' aria-label='Close' />;
}

// 3. Button with spread props including type
// This should pass the rule
export function ButtonWithTypedSpreadProps(): JSX.Element {
  const buttonProps = {
    type: 'button' as const,
    onClick: () => console.info('clicked'),
  };

  return <button {...buttonProps}>Click me</button>;
}

// 4. Button with dynamic type
// This should pass the rule
export function ButtonWithDynamicType({
  buttonType,
}: {
  buttonType: 'button' | 'submit' | 'reset';
}): JSX.Element {
  return <button type={buttonType}>Dynamic Button</button>;
}

// 5. Non-button elements
// These should be ignored by the rule
export function NonButtonElements(): JSX.Element {
  return (
    <div>
      <div>Not a button</div>
      <input type='button' value='Input Button' />
      <a href='#' className='button'>
        Link Button
      </a>
    </div>
  );
}

// 6. Custom button component
// This should be ignored by the rule
function CustomButton({ children, ...props }: { children: ReactNode }): JSX.Element {
  return (
    <button type='button' {...props}>
      {children}
    </button>
  );
}

export function UsingCustomButton(): JSX.Element {
  return (
    <div>
      <CustomButton>Custom Button</CustomButton>
    </div>
  );
}

// 7. Button with type from props with default
// This should pass the rule
export function ButtonWithDefaultType({
  type = 'button',
}: {
  type?: 'button' | 'submit' | 'reset';
}): JSX.Element {
  return <button type={type}>Button with Default</button>;
}

// 8. Button with conditional type
// This should pass the rule
export function ButtonWithConditionalType({
  isSubmit = false,
}: {
  isSubmit?: boolean;
}): JSX.Element {
  return (
    <button type={isSubmit ? 'submit' : 'button'}>{isSubmit ? 'Submit Form' : 'Click me'}</button>
  );
}
