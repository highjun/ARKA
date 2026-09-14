import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { implementsClassName, implementsDataComponent, implementsNoA11yViolations, implementsRef } from '#utils/testing';
import { InputComposer } from './InputComposer';

/** 값·모드·모델 3축의 controlled/uncontrolled 와 submit 동작이 계약대로인지 본다. */
describe('InputComposer', () => {
  implementsClassName((extra) => <InputComposer {...extra} />);
  implementsDataComponent((extra) => <InputComposer {...extra} />, 'InputComposer');
  implementsRef<HTMLFormElement>((extra) => <InputComposer {...extra} />, HTMLFormElement);
  implementsNoA11yViolations(() => <InputComposer />);

  it('값이 비어 있지 않을 때만 전송할 수 있고 전송 후에는 값을 비운다', () => {
    const onSubmitValue = vi.fn();

    render(<InputComposer onSubmitValue={onSubmitValue} />);

    const textarea = screen.getByRole('textbox');
    const submit = screen.getByRole('button', { name: 'Submit' });
    expect(submit).toBeDisabled();

    fireEvent.change(textarea, { target: { value: '   ' } });
    expect(submit).toBeDisabled();

    fireEvent.change(textarea, { target: { value: '안녕' } });
    fireEvent.click(submit);

    expect(onSubmitValue).toHaveBeenCalledWith('안녕');
    expect(textarea).toHaveValue('');
  });

  it('Enter 로 전송하고 Shift+Enter 는 줄바꿈으로 남긴다', () => {
    const onSubmitValue = vi.fn();

    render(<InputComposer defaultValue="안녕" onSubmitValue={onSubmitValue} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(onSubmitValue).not.toHaveBeenCalled();

    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onSubmitValue).toHaveBeenCalledWith('안녕');
  });

  it('제어된 value 는 건드리지 않고 변경만 알린다', () => {
    const onValueChange = vi.fn();

    render(<InputComposer value="고정" onValueChange={onValueChange} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '바뀜' } });

    expect(onValueChange).toHaveBeenCalledWith('바뀜');
    expect(textarea).toHaveValue('고정');
  });

  it('비제어 전송 뒤 값을 비울 때 onValueChange 를 부르지 않는다', () => {
    const onValueChange = vi.fn();
    const onSubmitValue = vi.fn();

    render(<InputComposer defaultValue="안녕" onValueChange={onValueChange} onSubmitValue={onSubmitValue} />);

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(onSubmitValue).toHaveBeenCalledWith('안녕');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('세그먼트를 클릭하면 mode 를 바꾸고 onModeChange 로 알린다', () => {
    const onModeChange = vi.fn();

    render(<InputComposer defaultMode="action" onModeChange={onModeChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Plan' }));

    expect(onModeChange).toHaveBeenCalledWith('plan');
  });

  it('제어된 mode 는 바꾸지 않고 변경만 알린다', () => {
    const onModeChange = vi.fn();

    render(<InputComposer mode="action" onModeChange={onModeChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Plan' }));

    expect(onModeChange).toHaveBeenCalledWith('plan');
    expect(screen.getByRole('button', { name: 'Action' })).toHaveAttribute('aria-pressed', 'true');
  });
});
