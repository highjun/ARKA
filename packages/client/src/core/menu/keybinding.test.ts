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
  it('when 절이 없는 항목은 매칭된다', () => {
    const registry = registryWith({ id: 'todo.add.key', keybinding: 'ctrl+k', actionId: 'todo.add' });

    expect(matchKeybinding(registry, ctx, 'ctrl+k')?.actionId).toBe('todo.add');
  });

  it('맞는 keybinding 이 없으면 undefined 를 돌려준다', () => {
    const registry = registryWith({ id: 'todo.add.key', keybinding: 'ctrl+k', actionId: 'todo.add' });

    expect(matchKeybinding(registry, ctx, 'ctrl+b')).toBeUndefined();
  });

  it('when 절이 false 인 항목은 건너뛴다', () => {
    const registry = registryWith(
      { id: 'a', keybinding: 'ctrl+b', actionId: 'bold', when: () => false },
      { id: 'b', keybinding: 'ctrl+b', actionId: 'fallback', when: () => true },
    );

    expect(matchKeybinding(registry, ctx, 'ctrl+b')?.actionId).toBe('fallback');
  });

  it('조건은 등록 시점이 아니라 매칭 시점에 읽는다', () => {
    let markdown = false;
    const registry = registryWith({ id: 'a', keybinding: 'ctrl+b', actionId: 'bold', when: () => markdown });

    expect(matchKeybinding(registry, ctx, 'ctrl+b')).toBeUndefined();

    markdown = true;
    expect(matchKeybinding(registry, ctx, 'ctrl+b')?.actionId).toBe('bold');
  });

  it('when 절에 context registry 를 넘긴다', () => {
    const registry = registryWith({
      id: 'a',
      keybinding: 'ctrl+b',
      actionId: 'bold',
      when: (received) => received === ctx,
    });

    expect(matchKeybinding(registry, ctx, 'ctrl+b')?.actionId).toBe('bold');
  });
});
