import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { implementsClassName, implementsDataComponent, implementsForwardRef, implementsNoA11yViolations } from '#utils/testing';
import { Icon } from '#components/common/Icon';
import { IconButton } from './IconButton';

const icon = () => <Icon iconId="settingsGear" size="sm" />;

describe('IconButton', () => {
  implementsClassName((extra) => <IconButton aria-label="설정" icon={icon} {...extra} />);
  implementsDataComponent((extra) => <IconButton aria-label="설정" icon={icon} {...extra} />, 'IconButton');
  implementsForwardRef((extra) => <IconButton aria-label="설정" icon={icon} {...extra} />, HTMLButtonElement);
  implementsNoA11yViolations(() => <IconButton aria-label="설정" icon={icon} />);

  it('클릭하면 onClick이 호출된다 — 계약을 재선언 없이 그대로 통과시킨다', () => {
    const onClick = vi.fn();
    render(<IconButton aria-label="설정" icon={icon} onClick={onClick} />);

    fireEvent.click(screen.getByRole('button', { name: '설정' }));

    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('variant/size/disabled 등 Primer IconButton의 props를 그대로 받는다', () => {
    render(<IconButton aria-label="설정" icon={icon} variant="danger" size="large" disabled />);

    const button = screen.getByRole('button', { name: '설정' });
    expect(button).toHaveAttribute('data-variant', 'danger');
    expect(button).toHaveAttribute('data-size', 'large');
    expect(button).toBeDisabled();
  });
});
