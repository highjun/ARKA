/** 어느 스코프에도 등록되지 않은 토큰을 조회했다. */
export class TokenNotRegisteredError extends Error {
  /** `description`은 토큰이 든 이름이다 — 메시지에 그대로 실려 어느 토큰인지 바로 보인다. */
  constructor(description: string) {
    super(`"${description}"이(가) 어느 스코프에도 등록되지 않았습니다.`);
    this.name = "TokenNotRegisteredError";
  }
}

/**
 * 의존이 자기 자신으로 돌아왔다.
 *
 * 감지하지 않으면 스택 오버플로로 터지는데, 그 스택에는 컨테이너 내부 프레임만
 * 남아 어느 토큰이 원인인지 알 수 없다. 경로를 그대로 메시지에 싣는다.
 */
export class CircularDependencyError extends Error {
  /** `path`는 조회가 지나온 토큰 이름 순서다. 그대로 이어 붙여 순환을 보여준다. */
  constructor(path: readonly string[]) {
    super(`의존이 순환합니다: ${path.join(" → ")}`);
    this.name = "CircularDependencyError";
  }
}
