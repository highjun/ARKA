import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { implementsClassName, implementsDataComponent, implementsNoA11yViolations } from '#utils/testing';
import { InputComposer } from './InputComposer';

/** 값·모드·모델 3축의 controlled/uncontrolled 와 submit 동작이 계약대로인지 본다. */
describe('InputComposer', () => {
  implementsClassName((extra) => <InputComposer {...extra} />);
  implementsDataComponent((extra) => <InputComposer {...extra} />, 'InputComposer');
  implementsNoA11yViolations(() => <InputComposer />);

  it('enables submit only for a non-blank value and clears it after sending', () => {
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

  it('submits on Enter but keeps the newline for Shift+Enter', () => {
    const onSubmitValue = vi.fn();

    render(<InputComposer defaultValue="안녕" onSubmitValue={onSubmitValue} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.keyDown(textarea, { key: 'Enter', shiftKey: true });
    expect(onSubmitValue).not.toHaveBeenCalled();

    fireEvent.keyDown(textarea, { key: 'Enter' });
    expect(onSubmitValue).toHaveBeenCalledWith('안녕');
  });

  it('keeps a controlled value untouched and only reports the change', () => {
    const onValueChange = vi.fn();

    render(<InputComposer value="고정" onValueChange={onValueChange} />);

    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '바뀜' } });

    expect(onValueChange).toHaveBeenCalledWith('바뀜');
    expect(textarea).toHaveValue('고정');
  });

  it('does not call onValueChange when clearing the value after an uncontrolled submit', () => {
    const onValueChange = vi.fn();
    const onSubmitValue = vi.fn();

    render(<InputComposer defaultValue="안녕" onValueChange={onValueChange} onSubmitValue={onSubmitValue} />);

    fireEvent.click(screen.getByRole('button', { name: 'Submit' }));

    expect(onSubmitValue).toHaveBeenCalledWith('안녕');
    expect(onValueChange).not.toHaveBeenCalled();
  });

  it('switches mode when a segment is clicked and reports it via onModeChange', () => {
    const onModeChange = vi.fn();

    render(<InputComposer defaultMode="action" onModeChange={onModeChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Plan' }));

    expect(onModeChange).toHaveBeenCalledWith('plan');
  });

  it('keeps a controlled mode unchanged and only reports the change', () => {
    const onModeChange = vi.fn();

    render(<InputComposer mode="action" onModeChange={onModeChange} />);

    fireEvent.click(screen.getByRole('button', { name: 'Plan' }));

    expect(onModeChange).toHaveBeenCalledWith('plan');
    expect(screen.getByRole('button', { name: 'Action' })).toHaveAttribute('aria-pressed', 'true');
  });
});
