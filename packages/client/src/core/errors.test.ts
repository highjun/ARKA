import { describe, expect, it } from 'vitest';
import { CoreError } from './errors';

describe('CoreError', () => {
  it('sets name and message', () => {
    const error = new CoreError('boom');

    expect(error.name).toBe('CoreError');
    expect(error.message).toBe('boom');
    expect(error).toBeInstanceOf(Error);
  });

  it('sets name to the subclass name when extended', () => {
    class SpecificError extends CoreError {}

    const error = new SpecificError('boom');

    expect(error.name).toBe('SpecificError');
    expect(error).toBeInstanceOf(CoreError);
  });
});
