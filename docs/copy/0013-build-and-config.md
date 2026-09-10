# ADR 0013: 산출물과 설정 파일의 자리

## 결정:
- **설정은 그것이 다스리는 패키지에 둔다.** 루트에는 전 패키지 공통(`tsconfig.base.json`, `eslint.config.ts`, `pnpm-workspace.yaml`)만 남긴다.
- **vitest 설정은 `vite.config.ts` 안에 둔다.** 별도 파일로 빼면 플러그인·별칭을 두 벌 유지하게 되고, 한쪽만 고치면 테스트와 빌드가 갈린다.
- 산출물은 전부 `.gitignore` — `dist/`, `.output/`, `storybook-static/`. **린트의 `ignores`에도 함께 넣는다**(번들된 코드가 규칙에 걸려도 고칠 소스가 거기가 아니다).
- 산출물이 아니라 **입력**인 것은 커밋한다 — VRT 기준 이미지(`test/vrt/snapshots/`), E2E 워크스페이스 fixture(`e2e/fixture/`).
- 커스텀 린트 규칙은 `tooling/eslint-rules/`에 두고 루트 config가 상대경로로 로드한다.

## 기각:
- **별도 `vitest.config.ts`** — 위와 같은 이유. 갈라질 실제 사유가 생기면 그때 나눈다.
- 커스텀 린트 규칙을 npm 패키지로 빼기 — 저장소 밖에서 쓸 사람이 없는데 배포·버저닝만 는다.
- 산출물을 커밋하기 — 리뷰에서 diff가 소스를 덮고, 빌드 재현성을 확인할 길이 사라진다.
- 산출물을 `.gitignore`에만 넣고 린트에는 안 넣기 — 실제로 `storybook-static/`의 번들이 `no-func-assign`으로 수백 건 에러를 냈다.

## 상태:
승인됨. 2026-09-09 — 루트 `dist/`가 생겼다: `dist/client/`(vite)와 `dist/server/index.js`(esbuild 단일 번들, 의존성 포함). `pnpm run build`가 둘을 만들고 `pnpm run start`가 돌린다. Dockerfile은 `dist/`만 실행 이미지에 복사한다(node_modules 없음). 컨테이너 경계 스모크는 `test/docker/smoke.sh`.
