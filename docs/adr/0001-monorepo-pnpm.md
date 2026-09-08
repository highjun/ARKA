# ADR 0001: pnpm workspaces 모노레포

## 결정: 
- 서버와 클라이언트가 같은 타입을 공유해야 한다.
- 따라서, 패키지를 3개(`contracts`·`client`·`server`)로 나누고, MonoRepo로 관리한다.
- MonoRepo로의 관리를 위해서 `pnpm workspaces`로 묶고, 패키지 간 참조는 workspace 패키지명(`import { URI } from "contracts"`)으로 한다. pnpm이 만든 심볼릭 링크와 `contracts`의 `main` 필드로 해석되므로 tsc·vitest·node·번들러가 모두 같은 방식으로 찾는다.

## 기각: 
- Turborepo·Nx — 패키지 3개 규모에서 빌드 캐싱 이득이 미미한데 반해, 설정·학습 비용만 남는다(5개 이상 + CI 지연이 생기면 재검토).
- TypeScript project references — 설정이 까다롭고 이 규모에서 얻는 게 없다.
- tsconfig `paths` 별칭(`@contracts/*`) — tsc만 아는 별칭이라 타입 검사는 통과하는데 vitest·node에서 모듈을 못 찾는다. 도구마다 같은 별칭을 다시 등록해야 한다.

## 상태: 
승인됨.
