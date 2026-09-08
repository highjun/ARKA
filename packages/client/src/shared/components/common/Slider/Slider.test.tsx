import { fireEvent, render, screen } from '@testing-library/react';
import { implementsClassName, implementsDataComponent, implementsForwardRef, implementsNoA11yViolations } from '#utils/testing';
import { Slider } from './Slider';

const noop = (): void => {};

describe('Slider', () => {
  implementsClassName((extra) => <Slider {...extra} value={30} max={100} aria-label="탐색" onValueChange={noop} />);
  implementsDataComponent((extra) => <Slider {...extra} value={30} max={100} aria-label="탐색" onValueChange={noop} />, 'Slider');
  implementsForwardRef((extra) => <Slider {...extra} value={30} max={100} aria-label="탐색" onValueChange={noop} />, HTMLSpanElement);
  implementsNoA11yViolations(() => <Slider value={30} max={100} aria-label="탐색" onValueChange={noop} />);

  it('value 를 role=slider 의 aria-valuenow 로 노출한다', () => {
    render(<Slider value={30} max={100} aria-label="탐색" onValueChange={noop} />);

    expect(screen.getByRole('slider')).toHaveAttribute('aria-valuenow', '30');
  });

  it('키보드로 조작하면 onValueChange 를 부른다', () => {
    const onChange = vi.fn();
    render(<Slider value={30} max={100} aria-label="탐색" onValueChange={onChange} />);

    const thumb = screen.getByRole('slider');
    thumb.focus();
    fireEvent.keyDown(thumb, { key: 'ArrowRight' });

    expect(onChange).toHaveBeenCalledWith(31);
  });

  it('disabled 면 role=slider 에 data-disabled 가 붙는다(Radix 는 aria-disabled 대신 이걸 쓴다)', () => {
    render(<Slider value={30} max={100} aria-label="탐색" onValueChange={noop} disabled />);

    expect(screen.getByRole('slider')).toHaveAttribute('data-disabled');
  });
});
