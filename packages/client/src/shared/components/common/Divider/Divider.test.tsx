import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import {
  implementsClassName,
  implementsDataComponent,
  implementsForwardRef,
  implementsNoA11yViolations,
} from '#utils/testing';
import { Divider } from './Divider';

describe('Divider', () => {
  implementsClassName((extra) => <Divider {...extra} />);
  implementsDataComponent((extra) => <Divider {...extra} />, 'Divider');
  implementsForwardRef((extra) => <Divider {...extra} />, HTMLHRElement);
  implementsNoA11yViolations(() => <Divider />);

  it('기본은 horizontal, vertical 은 aria-orientation 을 얹는다', () => {
    const horizontal = render(<Divider />);
    expect(horizontal.container.querySelector('hr')).toHaveAttribute('data-orientation', 'horizontal');
    expect(horizontal.container.querySelector('hr')).not.toHaveAttribute('aria-orientation');

    const vertical = render(<Divider orientation="vertical" />);
    expect(vertical.container.querySelector('hr')).toHaveAttribute('data-orientation', 'vertical');
    expect(vertical.container.querySelector('hr')).toHaveAttribute('aria-orientation', 'vertical');
  });
});
