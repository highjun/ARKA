import { describe, expect, it } from 'vitest';
import { CoreError } from '#core/errors';
import { DescriptorNotFoundError, DuplicateDescriptorError } from './errors';

describe('DescriptorNotFoundError', () => {
  it('carries the missing id and a matching message', () => {
    const error = new DescriptorNotFoundError('todo.add');

    expect(error.id).toBe('todo.add');
    expect(error.message).toBe('No descriptor registered for id "todo.add".');
    expect(error).toBeInstanceOf(CoreError);
  });
});

describe('DuplicateDescriptorError', () => {
  it('carries the duplicated id and a matching message', () => {
    const error = new DuplicateDescriptorError('todo.add');

    expect(error.id).toBe('todo.add');
    expect(error.message).toBe('A descriptor is already registered for id "todo.add".');
    expect(error).toBeInstanceOf(CoreError);
  });
});
