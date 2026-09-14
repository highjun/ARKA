import { testStorageContract } from '../model/storage.contract';
import { createStoragePort } from './LocalStorage';

/**
 * 계약을 실제 `localStorage`(jsdom이 진짜로 제공한다 — clipboard와 달리 mock이 필요 없다)에서
 * 검사한다. Adapter의 이름은 이 파일 어디에도 나오지 않는다.
 */

describe('get·set', () => {
  afterEach(() => {
    localStorage.clear();
  });

  it('쓴 것을 그대로 읽는다', () => {
    const storage = createStoragePort();

    storage.set('k', 'v');

    expect(storage.get('k')).toBe('v');
  });

  it('저장된 적 없는 키는 null이다', () => {
    expect(createStoragePort().get('없는키')).toBeNull();
  });

  it('덮어쓰면 나중 값이 남는다', () => {
    const storage = createStoragePort();

    storage.set('k', 'a');
    storage.set('k', 'b');

    expect(storage.get('k')).toBe('b');
  });
});

testStorageContract('LocalStorage', () => {
  localStorage.clear();
  return createStoragePort();
});
