import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { implementsClassName, implementsDataComponent, implementsForwardRef, implementsNoA11yViolations } from '#utils/testing';
import { Code } from './Code';

describe('Code', () => {
  implementsClassName((extra) => <Code {...extra}>내용</Code>);
  implementsDataComponent((extra) => <Code {...extra}>내용</Code>, 'Code');
  implementsForwardRef((extra) => <Code {...extra}>내용</Code>, HTMLElement);
  implementsNoA11yViolations(() => <Code>내용</Code>);

  it('code 태그로 렌더링된다', () => {
    render(<Code>내용</Code>);

    expect(screen.getByText('내용').tagName).toBe('CODE');
  });
});
