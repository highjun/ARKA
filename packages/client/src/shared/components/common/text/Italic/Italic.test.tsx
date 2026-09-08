import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { implementsClassName, implementsDataComponent, implementsForwardRef, implementsNoA11yViolations } from '#utils/testing';
import { Italic } from './Italic';

describe('Italic', () => {
  implementsClassName((extra) => <Italic {...extra}>내용</Italic>);
  implementsDataComponent((extra) => <Italic {...extra}>내용</Italic>, 'Italic');
  implementsForwardRef((extra) => <Italic {...extra}>내용</Italic>, HTMLElement);
  implementsNoA11yViolations(() => <Italic>내용</Italic>);

  it('em 태그로 렌더링된다', () => {
    render(<Italic>내용</Italic>);

    expect(screen.getByText('내용').tagName).toBe('EM');
  });
});
