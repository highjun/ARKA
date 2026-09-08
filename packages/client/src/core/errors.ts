/**
 * `@arka/core` 가 던지는 모든 error 의 뿌리. 소비자가 "이 패키지에서 온 것"을 한 번에 붙잡는다.
 *
 * `erasableSyntaxOnly` 하에서는 생성자 파라미터 프로퍼티(`constructor(readonly x: T)`)가 순수
 * 타입 소거로 안 끝나는 런타임 코드(필드 할당)를 만들어서 금지된다 — 필드를 명시적으로 선언하고
 * 생성자 본문에서 대입한다.
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
