declare const TOKEN_TYPE: unique symbol;

/**
 * 컨테이너에 등록·조회할 대상의 식별자.
 *
 * `T`는 타입 자리에만 존재한다(`resolve`가 무엇을 돌려주는지 추론하기 위한 것) —
 * 런타임 값은 `description`뿐이다. 문자열 키를 쓰지 않는 이유는 두 가지다:
 * 오타가 런타임까지 살아남지 않고, 나중에 익스텐션이 각자 토큰을 만들어도
 * 이름이 같다는 이유로 충돌하지 않는다.
 */
export interface Token<T> {
  readonly description: string;
  readonly [TOKEN_TYPE]: T;
}

export function createToken<T>(description: string): Token<T> {
  return { description } as Token<T>;
}
