import { step } from "./run.ts";

step("pnpm", "--filter", "ops", "run", "check");
step("pnpm", "-r", "--if-present", "run", "build");
step("pnpm", "--filter", "client", "run", "test:e2e");
step("pnpm", "--filter", "client", "run", "test:visual-regression");
step("pnpm", "--filter", "ops", "run", "test:smoke");
