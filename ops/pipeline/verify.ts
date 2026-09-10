import { step } from "./run.ts";

/**
 * 내보내기 전에 도는 관문. **CI가 없으므로 이것이 유일하다.**
 *
 * 순서에 이유가 있다 — `check`가 가장 싸고, E2E·VRT는 `build` 산출물을 쓰며, 스모크는 빈
 * 컨테이너에서 `pnpm install --frozen-lockfile`부터 다시 해 "내 기계에서만 되는 것"을 잡는다.
 * 몇 분 걸리니 라운드마다 돌리지 않는다.
 */
step("pnpm", "--filter", "ops", "run", "check");
step("pnpm", "-r", "run", "build");
step("pnpm", "--filter", "client", "run", "test:e2e");
step("pnpm", "--filter", "client", "run", "test:vrt");
step("pnpm", "--filter", "ops", "run", "test:smoke");
