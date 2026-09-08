import { describe, expect, it } from 'vitest';
import { normalizeKeybinding } from './normalize';

describe('normalizeKeybinding', () => {
  const eventOf = (overrides: Partial<KeyboardEvent>): KeyboardEvent =>
    ({ ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, key: '', ...overrides }) as KeyboardEvent;

  it('merges ctrl and meta into "ctrl"', () => {
    expect(normalizeKeybinding(eventOf({ ctrlKey: true, key: 'k' }))).toBe('ctrl+k');
    expect(normalizeKeybinding(eventOf({ metaKey: true, key: 'k' }))).toBe('ctrl+k');
  });

  it('orders modifiers as ctrl, alt, shift', () => {
    expect(normalizeKeybinding(eventOf({ ctrlKey: true, altKey: true, shiftKey: true, key: 'k' }))).toBe(
      'ctrl+alt+shift+k',
    );
  });

  it('excludes the modifier key itself when it is the pressed key', () => {
    expect(normalizeKeybinding(eventOf({ ctrlKey: true, key: 'Control' }))).toBe('ctrl');
  });

  it('lowercases the key', () => {
    expect(normalizeKeybinding(eventOf({ key: 'K' }))).toBe('k');
  });
});
