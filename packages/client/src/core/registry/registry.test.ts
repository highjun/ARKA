import { describe, expect, it } from 'vitest';
import { DescriptorNotFoundError, DuplicateDescriptorError } from './errors';
import { createRegistry } from './registry';
import type { Descriptor } from './descriptor';

interface CommandDescriptor extends Descriptor {
  readonly label: string;
}

const registryWith = (...descriptors: CommandDescriptor[]) => {
  const registry = createRegistry<CommandDescriptor>();
  for (const descriptor of descriptors) registry.add(descriptor);
  return registry;
};

describe('Registry', () => {
  it('adds and gets a descriptor by id', () => {
    const registry = registryWith({ id: 'todo.add', label: 'Add' });

    expect(registry.get('todo.add').label).toBe('Add');
  });

  it('throws an explicit error instead of returning undefined for an unknown id', () => {
    const registry = createRegistry<CommandDescriptor>();

    expect(() => registry.get('todo.add')).toThrow(DescriptorNotFoundError);
  });

  it('returns undefined from tryGet for an unknown id', () => {
    const registry = createRegistry<CommandDescriptor>();

    expect(registry.tryGet('todo.add')).toBeUndefined();
  });

  it('rejects registering two descriptors with the same id', () => {
    const registry = registryWith({ id: 'todo.add', label: 'Add' });

    expect(() => registry.add({ id: 'todo.add', label: 'Add again' })).toThrow(DuplicateDescriptorError);
  });

  it('lists every registered descriptor in insertion order', () => {
    const registry = registryWith({ id: 'a', label: 'A' }, { id: 'b', label: 'B' });

    expect(registry.list().map((descriptor) => descriptor.id)).toEqual(['a', 'b']);
  });

  it('matches an exact id with no params', () => {
    const registry = registryWith({ id: 'todo.add', label: 'Add' });

    expect(registry.match('todo.add')).toEqual([{ descriptor: { id: 'todo.add', label: 'Add' }, params: {} }]);
  });

  it('extracts params from a pattern id', () => {
    const registry = registryWith({ id: '/workspace/:fileId', label: 'Open' });

    const [matched] = registry.match('/workspace/readme.md');

    expect(matched?.descriptor.label).toBe('Open');
    expect(matched?.params).toEqual({ fileId: 'readme.md' });
  });

  it('returns both the exact and the pattern descriptor when both match', () => {
    const registry = registryWith(
      { id: '/workspace/settings', label: 'Settings' },
      { id: '/workspace/:fileId', label: 'Open' },
    );

    const labels = registry.match('/workspace/settings').map((matched) => matched.descriptor.label);

    expect(labels).toEqual(['Settings', 'Open']);
  });

  it('returns an empty list when nothing matches', () => {
    const registry = registryWith({ id: '/workspace/:fileId', label: 'Open' });

    expect(registry.match('/other/thing')).toEqual([]);
  });
});
