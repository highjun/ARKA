import { step } from "./run.ts";

/**
 * 라운드마다 도는 검사. **CI도 손도 이 파일을 부른다** — 목록이 두 벌이면 손에서 초록인데
 * CI에서 빨간 경로가 남는다(2026-09-14까지 순서가 실제로 갈려 있었고 `build`는 CI에만 있었다).
 *
 * **이름 하나가 명령 하나다.** 인자로 골라 부를 수 있어서, CI의 잡과 `pre-push` 훅이 목록을
 * 따로 적지 않고 **여기 있는 것과 같은 명령**을 부른다.
 *
 *     pnpm --filter ops check                    선언 순서대로 전부
 *     pnpm --filter ops check typecheck lint     고른 것만, 준 순서대로
 */
const STAGES: Readonly<Record<string, () => void>> = {
  /*
   * 순서에 이유가 있다 — 타입이 깨진 코드의 린트 오류와 테스트 실패는 대부분 그 타입 오류의
   * 그림자라, 함께 쏟아지면 원인이 가려진다.
   *
   * `--if-present`가 없으면 모든 실행이 빨간불이다 — `contracts`와 `ops`에는 `build`가 없어
   * pnpm이 `ERR_PNPM_RECURSIVE_RUN_NO_SCRIPT`로 멈춘다(2026-09-10 실측).
   */
  typecheck: () => step("pnpm", "-r", "--if-present", "run", "typecheck"),
  lint: () => step("pnpm", "-r", "--if-present", "run", "lint"),
  "test:unit": () => step("pnpm", "-r", "--if-present", "run", "test:unit"),
  /*
   * **통합은 따로 부른다** — 앱을 세우고 라우트를 두드리는 것이라 단위와 실패의 뜻이 다르다.
   * 한쪽만 이름이 있으면 CI가 둘을 따로 실을 때 CI에만 있는 검사가 생긴다.
   */
  "test:integration": () => step("pnpm", "-r", "--if-present", "run", "test:integration"),
  /** 가장 비싸서 마지막이다. */
  build: () => step("pnpm", "-r", "--if-present", "run", "build"),
  /*
   * **죽은 표면.** 패키지 하나만 봐서는 알 수 없어(다른 패키지가 쓰는지 봐야 한다) 패키지의
   * `lint`가 아니라 여기 있다. `--no-config-hints`인 이유는 진입점을 **일부러 명시**해서다 —
   * knip의 기본 탐지에 맡기면 그것이 바뀔 때 진입점이 조용히 사라진다.
   */
  knip: () => step("npx", "--prefix", "ops", "knip", "--config", "ops/knip.ts", "--no-config-hints"),
};

/**
 * 돌릴 단계. 인자가 없으면 선언 순서대로 전부다.
 *
 * **모르는 이름은 조용히 넘기지 않는다.** 오타 하나가 "검사가 0개인데 초록"을 만든다 —
 * 이 저장소가 가장 경계하는 실패 모양이다.
 */
export const chosen = (args: readonly string[], names: readonly string[]): readonly string[] => {
  if (args.length === 0) return names;
  const unknown = args.filter((name) => !names.includes(name));
  if (unknown.length > 0) throw new Error(`모르는 단계: ${unknown.join(", ")} (있는 것: ${names.join(", ")})`);
  return args;
};

if (process.argv[1] === import.meta.filename) {
  for (const name of chosen(process.argv.slice(2), Object.keys(STAGES))) STAGES[name]?.();
}
