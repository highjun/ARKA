import { describe, expect, it } from 'vitest';
import { createRegistry } from '#core/registry';
import type { ContextRegistry } from '#core/action';
import { matchMenuItems, type MenuItemDescriptor } from './menu';

const registryWith = (...entries: MenuItemDescriptor[]) => {
  const registry = createRegistry<MenuItemDescriptor>();
  for (const entry of entries) registry.add(entry);
  return registry;
};

const ctx = createRegistry() as ContextRegistry;

describe('matchMenuItems', () => {
  it('returns only items contributed to the given menu', () => {
    const registry = registryWith(
      { id: 'a', menuId: 'explorer.context', commandId: 'newFile' },
      { id: 'b', menuId: 'tab.actions', commandId: 'closeAll' },
    );

    expect(matchMenuItems(registry, ctx, 'explorer.context').map((item) => item.id)).toEqual(['a']);
  });

  it('skips items whose when clause is false', () => {
    const registry = registryWith(
      { id: 'a', menuId: 'explorer.context', commandId: 'newFile', when: () => false },
      { id: 'b', menuId: 'explorer.context', commandId: 'delete', when: () => true },
    );

    expect(matchMenuItems(registry, ctx, 'explorer.context').map((item) => item.id)).toEqual(['b']);
  });

  it('sorts by group first, then by order within a group', () => {
    const registry = registryWith(
      { id: 'delete', menuId: 'm', commandId: 'delete', group: '9_danger', order: 0 },
      { id: 'newFolder', menuId: 'm', commandId: 'newFolder', group: '1_create', order: 1 },
      { id: 'newFile', menuId: 'm', commandId: 'newFile', group: '1_create', order: 0 },
    );

    expect(matchMenuItems(registry, ctx, 'm').map((item) => item.id)).toEqual(['newFile', 'newFolder', 'delete']);
  });

  it('treats items without a group as sorting before any named group', () => {
    const registry = registryWith(
      { id: 'grouped', menuId: 'm', commandId: 'x', group: 'a_group' },
      { id: 'ungrouped', menuId: 'm', commandId: 'y' },
    );

    expect(matchMenuItems(registry, ctx, 'm').map((item) => item.id)).toEqual(['ungrouped', 'grouped']);
  });

  it('passes the context registry to the when clause', () => {
    const registry = registryWith({
      id: 'a',
      menuId: 'm',
      commandId: 'x',
      when: (received) => received === ctx,
    });

    expect(matchMenuItems(registry, ctx, 'm').map((item) => item.id)).toEqual(['a']);
  });
});
