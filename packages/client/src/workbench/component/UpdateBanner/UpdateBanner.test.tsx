import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { UpdateBanner } from './UpdateBanner';

describe('UpdateBanner', () => {
  it('status 역할로 안내를 띄운다', () => {
    render(<UpdateBanner onReload={() => undefined} />);
    expect(screen.getByRole('status')).toHaveTextContent('새 버전');
  });

  it('다시 불러오기를 누르면 onReload를 부른다', () => {
    const onReload = vi.fn();
    render(<UpdateBanner onReload={onReload} />);
    fireEvent.click(screen.getByRole('button', { name: '다시 불러오기' }));
    expect(onReload).toHaveBeenCalledTimes(1);
  });
});
