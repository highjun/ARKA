import { describe, expect, it } from 'vitest';
import { createRegistry } from '#core/registry';
import type { ContextRegistry } from '#core/action';
import { matchKeybinding, type KeybindingDescriptor } from './keybinding';

const registryWith = (...entries: KeybindingDescriptor[]) => {
  const registry = createRegistry<KeybindingDescriptor>();
  for (const entry of entries) registry.add(entry);
  return registry;
};

const ctx = createRegistry() as ContextRegistry;

describe('matchKeybinding', () => {
  it('matches an entry without a when clause', () => {
    const registry = registryWith({ id: 'todo.add.key', keybinding: 'ctrl+k', actionId: 'todo.add' });

    expect(matchKeybinding(registry, ctx, 'ctrl+k')?.actionId).toBe('todo.add');
  });

  it('returns undefined when no keybinding matches', () => {
    const registry = registryWith({ id: 'todo.add.key', keybinding: 'ctrl+k', actionId: 'todo.add' });

    expect(matchKeybinding(registry, ctx, 'ctrl+b')).toBeUndefined();
  });

  it('skips an entry whose when clause is false', () => {
    const registry = registryWith(
      { id: 'a', keybinding: 'ctrl+b', actionId: 'bold', when: () => false },
      { id: 'b', keybinding: 'ctrl+b', actionId: 'fallback', when: () => true },
    );

    expect(matchKeybinding(registry, ctx, 'ctrl+b')?.actionId).toBe('fallback');
  });

  it('reads the condition at match time, not at registration time', () => {
    let markdown = false;
    const registry = registryWith({ id: 'a', keybinding: 'ctrl+b', actionId: 'bold', when: () => markdown });

    expect(matchKeybinding(registry, ctx, 'ctrl+b')).toBeUndefined();

    markdown = true;
    expect(matchKeybinding(registry, ctx, 'ctrl+b')?.actionId).toBe('bold');
  });

  it('passes the context registry to the when clause', () => {
    const registry = registryWith({
      id: 'a',
      keybinding: 'ctrl+b',
      actionId: 'bold',
      when: (received) => received === ctx,
    });

    expect(matchKeybinding(registry, ctx, 'ctrl+b')?.actionId).toBe('bold');
  });
});
