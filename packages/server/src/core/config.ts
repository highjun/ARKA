import { realpath, stat } from "node:fs/promises";
import path from "node:path";
import { z } from "zod";

export class ConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ConfigError";
  }
}

const CoreEnv = z.object({
  ARKA_WORKSPACE: z.string().min(1).optional(),
  ARKA_PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  ARKA_HOST: z.string().min(1).default("127.0.0.1"),
  ARKA_CLIENT_ROOT: z.string().min(1).optional(),
  ARKA_GIT_SHA: z.string().min(1).optional(),
});

export type ServerConfig = {
  readonly workspaceRoot: string;
  readonly port: number;
  readonly host: string;
  readonly clientRoot: string | undefined;
  readonly gitSha: string | undefined;
};

const resolveDirectory = async (name: string, value: string): Promise<string> => {
  const absolute = path.resolve(value);
  let real: string;
  try {
    real = await realpath(absolute);
  } catch {
    throw new ConfigError(`${name}: no such directory: ${absolute}`);
  }
  const stats = await stat(real);
  if (!stats.isDirectory()) {
    throw new ConfigError(`${name}: not a directory: ${absolute}`);
  }
  return real;
};

const withoutEmpty = (env: Readonly<Record<string, string | undefined>>): Record<string, string | undefined> =>
  Object.fromEntries(Object.entries(env).filter(([, value]) => value !== ""));

const parseEnv = <T>(schema: z.ZodType<T>, env: Readonly<Record<string, string | undefined>>): T => {
  const parsed = schema.safeParse(env);
  if (parsed.success) return parsed.data;
  const issue = parsed.error.issues[0];
  throw new ConfigError(`${issue?.path.join(".") ?? "env"}: ${issue?.message ?? "invalid"}`);
};

export const loadConfig = async (
  env: Readonly<Record<string, string | undefined>> = process.env,
): Promise<ServerConfig> => {
  const present = withoutEmpty(env);
  const { ARKA_WORKSPACE, ARKA_PORT, ARKA_HOST, ARKA_CLIENT_ROOT, ARKA_GIT_SHA } = parseEnv(CoreEnv, present);

  return {
    workspaceRoot: await resolveDirectory("ARKA_WORKSPACE", ARKA_WORKSPACE ?? process.cwd()),
    port: ARKA_PORT,
    host: ARKA_HOST,
    clientRoot:
      ARKA_CLIENT_ROOT === undefined ? undefined : await resolveDirectory("ARKA_CLIENT_ROOT", ARKA_CLIENT_ROOT),
    gitSha: ARKA_GIT_SHA,
  };
};
