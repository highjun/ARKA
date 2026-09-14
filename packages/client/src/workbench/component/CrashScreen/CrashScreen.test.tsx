import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { implementsClassName, implementsDataComponent, implementsNoA11yViolations, implementsRef } from '#utils/testing';
import { CrashScreen } from './CrashScreen';

describe('CrashScreen', () => {
  it('메시지를 보여주고 alert 역할을 갖는다', () => {
    render(<CrashScreen message="boom" onReload={() => undefined} />);
    expect(screen.getByRole('alert')).toHaveTextContent('boom');
  });

  it('다시 불러오기를 누르면 onReload를 부른다', () => {
    const onReload = vi.fn();
    render(<CrashScreen message="boom" onReload={onReload} />);
    fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });

  implementsClassName((extra) => <CrashScreen message="boom" onReload={() => undefined} {...extra} />);
  implementsDataComponent((extra) => <CrashScreen message="boom" onReload={() => undefined} {...extra} />, 'CrashScreen');
  implementsRef<HTMLDivElement>((extra) => <CrashScreen message="boom" onReload={() => undefined} {...extra} />, HTMLDivElement);
  implementsNoA11yViolations(() => <CrashScreen message="boom" onReload={() => undefined} />);
});
