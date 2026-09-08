import { TabContentRegistry } from './TabContentRegistry';
import type { ITabContentRegistry } from './ITabContentRegistry';

const make = (): ITabContentRegistry => {
  return new TabContentRegistry();
};

const NOOP_COMPONENT = () => null;

describe('ITabContentRegistry', () => {
  it('등록한 것을 조회할 수 있다', () => {
    const registry = make();
    registry.add({ id: 'file', iconId: 'fileCode', TabComponent: NOOP_COMPONENT });

    expect(registry.get('file').iconId).toBe('fileCode');
  });

  it('없는 항목은 tryGet이 undefined다', () => {
    const registry = make();

    expect(registry.tryGet('nope')).toBeUndefined();
  });
});
