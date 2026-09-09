# ADR 0001: 패키지는 contracts·client·server 셋이고 pnpm workspaces로 묶는다

## 맥락:
서버와 클라이언트가 같은 타입을 봐야 한다. 응답 스키마가 두 벌이 되면 한쪽이 조용히 어긋나고, 그 어긋남은 런타임에야 드러난다.

## 결정:
- 패키지는 `contracts`·`client`·`server` **셋**이다.
- `pnpm workspaces`로 묶는다.
- 패키지 간 참조는 **`#contracts`** 로 한다 — `import { URI } from "#contracts"`. 각 패키지의 `imports` 필드가 workspace 패키지명으로 잇고, pnpm 심볼릭 링크와 `contracts`의 `main`이 마저 푼다.
- `#` 접두는 이 저장소에서 이미 "우리 것"의 표시다(`#core/di`·`#components/common`, → [ADR 0012](0012-subpath-imports.md)). 맨이름 `"contracts"`는 서드파티와 구분되지 않는다.

## 기각:
- Turborepo·Nx — 패키지 3개 규모에서 빌드 캐싱 이득이 미미한데 설정·학습 비용만 남는다. **패키지 5개 이상 + CI 지연이 생기면 재검토한다.**
- TypeScript project references — 설정이 까다롭고 이 규모에서 얻는 게 없다.
- tsconfig `paths` 별칭(`@contracts/*`) — tsc만 아는 별칭이라 타입 검사는 통과하는데 vitest·node에서 모듈을 못 찾는다. 도구마다 같은 별칭을 다시 등록하게 된다.

## 대가:
`contracts`의 `main`이 빌드 산출물이 아니라 `./src/index.ts` — **TypeScript 원본**이다. 소비자가 전부 TS 도구(tsc·vite·vitest·tsx)라 지금은 조용하지만, JS만 쓰는 곳에서는 소비할 수 없고 그대로는 npm에 배포할 수도 없다. 소비자가 `contracts`의 타입 오류까지 함께 컴파일한다.

## 강제:
- **린트** `import-x/no-restricted-paths` — `contracts`가 `client`·`server`를 import 금지
- **린트** `import-x/no-restricted-paths` — `client`↔`server` 상호 import 금지
- **린트** `lint:config`(grep) — tsconfig `paths` 금지. 기각 항목을 직접 막는다
- **리뷰** — **"`#contracts`로 가져온다"**. 상대경로 `../../../contracts/src/…`는 zone을 통과한다

## 상태:
승인됨 (2026-09-08, 사후 기록)
