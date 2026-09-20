import { step } from "./run.ts";

const STAGES: Readonly<Record<string, () => void>> = {
  typecheck: () => step("pnpm", "-r", "--if-present", "run", "typecheck"),
  lint: () => step("pnpm", "-r", "--if-present", "run", "lint"),
  "test:unit": () => step("pnpm", "-r", "--if-present", "run", "test:unit"),
  "test:integration": () => step("pnpm", "-r", "--if-present", "run", "test:integration"),
  build: () => step("pnpm", "-r", "--if-present", "run", "build"),
  knip: () => step("npx", "--prefix", "ops", "knip", "--config", "ops/knip.ts", "--no-config-hints"),
};

export const chosen = (args: readonly string[], names: readonly string[]): readonly string[] => {
  if (args.length === 0) return names;
  const unknown = args.filter((name) => !names.includes(name));
  if (unknown.length > 0) throw new Error(`모르는 단계: ${unknown.join(", ")} (있는 것: ${names.join(", ")})`);
  return args;
};

if (process.argv[1] === import.meta.filename) {
  for (const name of chosen(process.argv.slice(2), Object.keys(STAGES))) STAGES[name]?.();
}
