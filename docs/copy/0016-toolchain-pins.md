# ADR 0016: 툴체인 버전은 린트가 도는 선에서 고른다

## 결정:
- **TypeScript는 6.x에 머문다.** typescript-eslint가 TypeScript 7을 하드 거부하기 때문이다.
- 도구 버전이 갈릴 때는 **린트가 도는 쪽**을 고른다. 린트는 [ADR 0005](0005-client-structure.md)·[0007](0007-server-structure.md)의 구조 규칙을 강제하는 유일한 장치라, 그것이 꺼지면 문서만 남는다.
- 버전은 lockfile이 고정한다. 범위(`^`)는 두되 올릴 때는 `pnpm run check`가 통과하는지 본다.

## 기각:
- TypeScript 7로 올리고 typescript-eslint를 빼기 — 구조 규칙을 강제할 수단이 사라진다. 새 컴파일러의 속도보다 규율이 무너지지 않는 쪽이 값이 크다.
- 최신 버전을 무조건 따라가기 — 도구 사이의 peer 범위가 어긋나는 순간을 매번 사람이 감당하게 된다.
- 버전을 정확히 못 박기(`^` 제거) — 보안 패치까지 손으로 올리게 된다. lockfile이 이미 재현성을 준다.

## 상태:
승인됨. TypeScript 7은 typescript-eslint가 지원하면 그때 올린다.
