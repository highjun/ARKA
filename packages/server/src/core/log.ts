/**
 * JSON 한 줄 로거. 필드 이름은 고정이다 — `time`·`level`·`event` 다음에 호출부가 준 것.
 *
 * 라이브러리를 쓰지 않는 이유: 필요한 것이 "한 줄에 한 JSON"뿐이고, 그건 열 줄이다.
 * 로그 수집기(docker logs, journald)가 그대로 파싱한다.
 */

/** `debug`는 두지 않는다 — 끄고 켤 장치가 없으면 결국 아무도 안 읽는다. */
export type LogLevel = "info" | "warn" | "error";

/** JSON 한 줄에 그대로 펼쳐진다. 키가 겹치면 뒤가 이긴다. */
export type LogFields = Readonly<Record<string, unknown>>;

/** 첫 인자는 **사건 이름**이지 문장이 아니다 — 수집기가 그걸로 묶는다. */
export interface Logger {
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
}

/**
 * `Error`는 그대로 직렬화하면 `{}`가 된다 — 이름·메시지·스택을 꺼내 담는다.
 * 그 밖의 값은 JSON이 하는 대로 둔다.
 */
export const serializeError = (error: unknown): LogFields => {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { value: String(error) };
};

/**
 * 비밀을 이름으로 알아본다 — `_KEY`·`_TOKEN`·`_SECRET`·`_PASSWORD`로 끝나는 필드(→ ADR 0007).
 *
 * **이름 규칙이 곧 이 동작이다.** 비밀에 그 접미사를 붙이기로 한 이유가 여기 있다 —
 * 붙어 있으면 기계가 알아보고, 안 붙어 있으면 아무 장치도 걸리지 않는다.
 * 대소문자를 가리지 않는다: 환경변수는 `ADE_ANTHROPIC_API_KEY`고 로그 필드는 `apiKey`다.
 */
const SECRET_FIELD = /(password|secret|token|key)$/iu;

/** 지운 자리의 표시. 필드가 **있었다는 것**은 남는다 — 없는 것과 가린 것은 다르다. */
const REDACTED = "***";

/** 순환 참조와 과도한 깊이를 막는다. 로그 한 줄이 스택을 넘기면 안 된다. */
const MAX_DEPTH = 6;

const maskValue = (value: unknown, depth: number): unknown => {
  if (depth >= MAX_DEPTH || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => maskValue(item, depth + 1));
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, SECRET_FIELD.test(key) ? REDACTED : maskValue(item, depth + 1)]),
  );
};

/**
 * 비밀로 보이는 필드를 가린다. **중첩된 것도 본다** — `{ config: { apiKey } }`가 흔한 실수다.
 *
 * 가린 것이 넘칠 수는 있다(`cacheKey`도 가려진다). 그쪽이 싸다 — 잘못 가린 것은 이름을 바꾸면
 * 되지만, **한 번 찍힌 비밀은 되돌릴 수 없다.**
 */
export const maskSecrets = (fields: LogFields): LogFields => maskValue(fields, 0) as LogFields;

/** `write`와 `now`를 받는 이유는 테스트가 출력과 시각을 붙잡기 위해서다. */
export const createLogger = (write: (line: string) => void, now: () => Date = () => new Date()): Logger => {
  const emit = (level: LogLevel, event: string, fields: LogFields | undefined): void => {
    write(`${JSON.stringify({ time: now().toISOString(), level, event, ...(fields === undefined ? {} : maskSecrets(fields)) })}\n`);
  };
  return {
    info: (event, fields) => emit("info", event, fields),
    warn: (event, fields) => emit("warn", event, fields),
    error: (event, fields) => emit("error", event, fields),
  };
};

/** 프로세스 표준 출력에 쓰는 로거. 부팅부만 만든다 — 그 밖에서는 주입받는다. */
export const createStdoutLogger = (): Logger => createLogger((line) => process.stdout.write(line));
