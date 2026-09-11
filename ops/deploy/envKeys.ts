/**
 * compose가 **사람에게 요구하는 환경변수**를 뽑는다.
 *
 * `.env.example`의 정본은 zod 스키마가 아니라 **여기**다 — 서버 스키마에는 이미지가 굽는
 * 것(`ADE_HOST`·`ADE_CLIENT_ROOT`·`ADE_DATA_DIR`·`ADE_GIT_SHA`)도 들어 있어서,
 * 그걸로 `.env.example`을 만들면 **채우면 안 되는 키까지 적히게 된다**(→ ADR 0007).
 */

/** `#` 뒤는 값이 아니라 설명이다. 주석 안의 예시(`${KEY:-}`)를 키로 세면 안 된다. */
const withoutComments = (yaml: string): string =>
  yaml
    .split("\n")
    .map((line) => line.replace(/#.*$/u, ""))
    .join("\n");

/**
 * compose가 요구하는 키. 두 가지 모양을 본다.
 *
 * - `${NAME}`·`${NAME:-기본값}` — 보간. 값이 없으면 기본값이나 빈 문자열이 들어간다.
 * - `- NAME` — 통과. 셸이나 `.env`에 **있을 때만** 컨테이너에 만들어진다.
 */
export const composeEnvKeys = (yaml: string): readonly string[] => {
  const body = withoutComments(yaml);
  const keys = new Set<string>();
  for (const [, name] of body.matchAll(/\$\{([A-Z][A-Z0-9_]*)/gu)) if (name !== undefined) keys.add(name);
  for (const [, name] of body.matchAll(/^\s+-\s+([A-Z][A-Z0-9_]*)\s*$/gmu)) if (name !== undefined) keys.add(name);
  return [...keys].sort();
};

/** `.env` 꼴 파일에 적힌 키. 값은 보지 않는다 — 비어 있는 것이 정상이다. */
export const envFileKeys = (text: string): readonly string[] => {
  const keys = new Set<string>();
  for (const [, name] of withoutComments(text).matchAll(/^\s*([A-Z][A-Z0-9_]*)\s*=/gmu)) {
    if (name !== undefined) keys.add(name);
  }
  return [...keys].sort();
};
