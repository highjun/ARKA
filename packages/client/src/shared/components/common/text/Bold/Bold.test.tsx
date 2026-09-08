import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { implementsClassName, implementsDataComponent, implementsForwardRef, implementsNoA11yViolations } from '#utils/testing';
import { Bold } from './Bold';

describe('Bold', () => {
  implementsClassName((extra) => <Bold {...extra}>내용</Bold>);
  implementsDataComponent((extra) => <Bold {...extra}>내용</Bold>, 'Bold');
  implementsForwardRef((extra) => <Bold {...extra}>내용</Bold>, HTMLElement);
  implementsNoA11yViolations(() => <Bold>내용</Bold>);

  it('strong 태그로 렌더링된다', () => {
    render(<Bold>내용</Bold>);

    expect(screen.getByText('내용').tagName).toBe('STRONG');
  });
});
