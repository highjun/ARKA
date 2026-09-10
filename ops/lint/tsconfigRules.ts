/**
 * tsconfig에 걸린 규칙의 **유일한 출처.**
 *
 * 같은 규칙을 두 기제가 나눠 맡고 있다 — 패키지의 tsconfig는 각 패키지의 ESLint가(`index.ts`의
 * `json/jsonc` 블록), 저장소 루트의 것은 `rootConfig.test.ts`가 본다. ESLint 10의 base path가
 * 설정 파일이 있는 디렉터리라 그 위로 넓힐 수 없어서다.
 *
 * 그래서 금지 키와 메시지를 여기 한 번만 적고 둘 다 이것을 읽는다. 문자열이 두 벌이면 한쪽만
 * 고쳤을 때 조용히 갈린다.
 */

/** `paths` 별칭 금지(→ ADR 0001) — tsc만 아는 별칭이라 타입 검사는 통과하는데 vitest·node가 모듈을 못 찾는다. */
export const FORBIDDEN_KEY = "paths";
export const FORBIDDEN_MESSAGE = "tsconfig paths 별칭을 쓰지 않습니다 — package.json의 imports 필드를 쓰세요.";
