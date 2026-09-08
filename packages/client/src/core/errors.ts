/**
 * `core` 가 던지는 모든 error 의 뿌리. 소비자가 "이 패키지에서 온 것"을 한 번에 붙잡는다.
 *
 * 생성자 파라미터 프로퍼티(`constructor(readonly x: T)`)를 쓰지 않는다 — 타입 소거만으로 끝나지
 * 않는 문법이라 esbuild·vite 같은 단일 파일 변환기와 어긋날 수 있다. 필드를 선언하고 본문에서 대입한다.
 *
 * DI 쪽 error 는 여기 없다 — 조회 실패는 컨테이너의 `TokenNotRegisteredError` 가 된다.
 * 우리가 만들지 않은 것을 우리 이름으로 감싸지 않는다.
 */
export class CoreError extends Error {
  constructor(message: string) {
    super(message);
    this.name = new.target.name;
  }
}
