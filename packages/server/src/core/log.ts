/**
 * JSON 한 줄 로거. 필드 이름은 고정이다 — `time`·`level`·`event` 다음에 호출부가 준 것.
 *
 * 라이브러리를 쓰지 않는 이유: 필요한 것이 "한 줄에 한 JSON"뿐이고, 그건 열 줄이다.
 * 로그 수집기(docker logs, journald)가 그대로 파싱한다.
 */

export type LogLevel = "info" | "warn" | "error";
export type LogFields = Readonly<Record<string, unknown>>;

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

export const createLogger = (write: (line: string) => void, now: () => Date = () => new Date()): Logger => {
  const emit = (level: LogLevel, event: string, fields: LogFields | undefined): void => {
    write(`${JSON.stringify({ time: now().toISOString(), level, event, ...fields })}\n`);
  };
  return {
    info: (event, fields) => emit("info", event, fields),
    warn: (event, fields) => emit("warn", event, fields),
    error: (event, fields) => emit("error", event, fields),
  };
};

/** 프로세스 표준 출력에 쓰는 로거. 부팅부만 만든다 — 그 밖에서는 주입받는다. */
export const createStdoutLogger = (): Logger => createLogger((line) => process.stdout.write(line));
