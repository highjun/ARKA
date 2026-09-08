import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { implementsClassName, implementsDataComponent, implementsForwardRef, implementsNoA11yViolations } from '#utils/testing';
import { Highlight } from './Highlight';

describe('Highlight', () => {
  implementsClassName((extra) => <Highlight {...extra}>내용</Highlight>);
  implementsDataComponent((extra) => <Highlight {...extra}>내용</Highlight>, 'Highlight');
  implementsForwardRef((extra) => <Highlight {...extra}>내용</Highlight>, HTMLElement);
  implementsNoA11yViolations(() => <Highlight>내용</Highlight>);

  it('mark 태그로 렌더링된다', () => {
    render(<Highlight>내용</Highlight>);

    expect(screen.getByText('내용').tagName).toBe('MARK');
  });
});
