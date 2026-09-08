import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { implementsClassName, implementsDataComponent, implementsForwardRef, implementsNoA11yViolations } from '#utils/testing';
import { Icon } from '#components/common/Icon';
import { ShortcutBar } from './ShortcutBar';

const children = (
  <>
    <Icon iconId="save" size="sm" />
    <Icon iconId="search" size="sm" />
  </>
);

describe('ShortcutBar', () => {
  implementsClassName((extra) => <ShortcutBar {...extra}>{children}</ShortcutBar>);
  implementsDataComponent((extra) => <ShortcutBar {...extra}>{children}</ShortcutBar>, 'ShortcutBar');
  implementsForwardRef((extra) => <ShortcutBar {...extra}>{children}</ShortcutBar>, HTMLDivElement);
  implementsNoA11yViolations(() => <ShortcutBar>{children}</ShortcutBar>);

  it('넘긴 children을 그대로 렌더한다', () => {
    const { container } = render(<ShortcutBar>{children}</ShortcutBar>);
    expect(container.querySelectorAll('[data-icon]')).toHaveLength(2);
  });
});
