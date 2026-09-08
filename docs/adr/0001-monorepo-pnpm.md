# ADR 0001: pnpm workspaces 모노레포

## 결정: 
- 서버와 클라이언트가 같은 타입을 공유해야 한다.
- 따라서, 패키지를 3개(`contracts`·`client`·`server`)로 나누고, MonoRepo로 관리한다.
- MonoRepo로의 관리를 위해서 `pnpm workspaces`로 묶고, 패키지 간 참조는 tsconfig의 `paths` 별칭(`@contracts/*`)으로 해결한다.

## 기각: 
- Turborepo·Nx — 패키지 3개 규모에서 빌드 캐싱 이득이 미미한데 반해, 설정·학습 비용만 남는다(5개 이상 + CI 지연이 생기면 재검토).
- TypeScript project references — 설정이 까다롭고 이 규모에서 얻는 게 없다.

## 상태: 
승인됨.
