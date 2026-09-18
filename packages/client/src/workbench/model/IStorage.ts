declare module "#core/di" {
  /** `IStorage`를 컨테이너에서 꺼내는 자리. */
  interface InstanceMap {
    "arka.workbench.storage": IStorage;
  }
}
/**
 * 브라우저 전역(`localStorage`)을 감싸는 통로 — 키/값 하나씩 읽고 쓰는 것 이상은 하지 않는다.
 *
 * `get`이 없는 키에 `null`을 주는 것은 `localStorage.getItem`과 같은 계약이다 — 소비자(Model)가
 * "저장된 적 없다"와 "빈 문자열이 저장돼 있다"를 구분할 수 있어야 한다.
 */
export interface IStorage {
  get(key: string): string | null;
  set(key: string, value: string): void;
}
