import { step } from "./run.ts";

/**
 * 내보내기 전에 도는 관문. **병합 전 강제는 CI가 든다**(→ ADR 0005) — 여기 남는 이유는
 * CI에 아직 없는 것 둘(VRT·Docker 경계 스모크)이 여기에만 있어서다.
 *
 * 순서에 이유가 있다 — `check`가 가장 싸고, E2E·VRT는 `build` 산출물을 쓰며, 스모크는 빈
 * 컨테이너에서 `pnpm install --frozen-lockfile`부터 다시 해 "내 기계에서만 되는 것"을 잡는다.
 * 몇 분 걸리니 라운드마다 돌리지 않는다.
 */
step("pnpm", "--filter", "ops", "run", "check");
// **`--if-present`가 없으면 여기서 죽는다** — `ops`와 `contracts`에 `build`가 없어
// pnpm이 `ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT`를 낸다. CI는 고쳤는데 여기는 안 고쳐
// 아래 세 줄에 **한 번도 닿지 못했다**(2026-09-13 발견).
step("pnpm", "-r", "--if-present", "run", "build");
step("pnpm", "--filter", "client", "run", "test:e2e");
step("pnpm", "--filter", "client", "run", "test:visual-regression");
step("pnpm", "--filter", "ops", "run", "test:smoke");
