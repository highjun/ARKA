type LogLevel = "info" | "warn" | "error";

export type LogFields = Readonly<Record<string, unknown>>;

export interface Logger {
  info(event: string, fields?: LogFields): void;
  warn(event: string, fields?: LogFields): void;
  error(event: string, fields?: LogFields): void;
}

export const serializeError = (error: unknown): LogFields => {
  if (error instanceof Error) {
    return { name: error.name, message: error.message, stack: error.stack };
  }
  return { value: String(error) };
};

const SECRET_FIELD = /(password|secret|token|key)$/iu;

const REDACTED = "***";

const MAX_DEPTH = 6;

const maskValue = (value: unknown, depth: number): unknown => {
  if (depth >= MAX_DEPTH || value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => maskValue(item, depth + 1));
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) => [key, SECRET_FIELD.test(key) ? REDACTED : maskValue(item, depth + 1)]),
  );
};

export const maskSecrets = (fields: LogFields): LogFields => maskValue(fields, 0) as LogFields;

export const createLogger = (write: (line: string) => void, now: () => Date = () => new Date()): Logger => {
  const emit = (level: LogLevel, event: string, fields: LogFields | undefined): void => {
    write(
      `${JSON.stringify({ time: now().toISOString(), level, event, ...(fields === undefined ? {} : maskSecrets(fields)) })}\n`,
    );
  };
  return {
    info: (event, fields) => emit("info", event, fields),
    warn: (event, fields) => emit("warn", event, fields),
    error: (event, fields) => emit("error", event, fields),
  };
};

export const createStdoutLogger = (): Logger => createLogger((line) => process.stdout.write(line));
