import { step } from "./run.ts";

/**
 * 라운드마다 도는 관문. **CI의 `check` 잡이 이 파일을 부른다** — 목록이 두 벌이면 손에서
 * 초록인데 CI에서 빨간 경로가 남는다(2026-09-14까지 순서가 실제로 갈려 있었고 `build`는
 * CI에만 있었다).
 *
 * 순서에 이유가 있다 — 타입이 깨진 코드의 린트 오류와 테스트 실패는 대부분 그 타입 오류의
 * 그림자라, 함께 쏟아지면 원인이 가려진다. `build`가 마지막인 이유는 가장 비싸서다.
 *
 * `--if-present`가 없으면 모든 실행이 빨간불이다 — `contracts`와 `ops`에는 `build`가 없어
 * pnpm이 `ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT`로 멈춘다(2026-09-10 실측).
 */
step("pnpm", "-r", "--if-present", "run", "typecheck");
step("pnpm", "-r", "--if-present", "run", "lint");
step("pnpm", "-r", "--if-present", "run", "test");
step("pnpm", "-r", "--if-present", "run", "build");
