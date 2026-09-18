/**
 * 커널이 내는 모든 오류의 부모 클래스. `instanceof CoreError` 하나로 커널 오류를 가려낸다.
 *
 * 생성자 파라미터 프로퍼티(`constructor(readonly x: T)`)를 쓰지 않는다 — 타입 소거만으로 끝나지
 * 않는 문법이라 esbuild·vite 같은 단일 파일 변환기와 어긋날 수 있다. 필드를 선언하고 본문에서 대입한다.
 */
export class CoreError extends Error {
  /** `name`은 `new.target`에서 온다 — 하위 클래스가 자기 이름을 따로 적지 않아도 된다. */
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
