import { step } from "./run.ts";

/** 라운드마다 도는 관문. 가장 싼 것부터 돌려 원인이 가려지지 않게 한다. */
step("pnpm", "-r", "run", "typecheck");
step("pnpm", "-r", "run", "lint");
step("pnpm", "-r", "run", "test");
