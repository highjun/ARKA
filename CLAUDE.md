# ARKASHIC — 에이전트 작업 규칙

규칙의 본문은 [CONVENTIONS.md](CONVENTIONS.md)다. 여기는 그 파일을 읽으라는 지시와, 매 라운드 반복되는 절차만 둔다.

## 시작할 때

1. `CONVENTIONS.md`를 읽는다. 왜 그렇게 정했는지는 `docs/adr/`에 있다.
2. 할 일은 **Backlog.md**(`backlog/tasks/`)에 있다. 새 할 일이 생기면 `backlog task create`로 남기고, 시작하면 `In Progress`, 끝나면 `Done`으로 옮긴다. 산문 백로그를 다른 문서에 쌓지 않는다.
3. 사용자만 할 수 있는 일(sudo, 클라우드 콘솔, 비밀값)은 `docs/USER_NOTE.md` 맨 위 "사용자가 해야 할 일"에 적는다.

## 라운드

- **한 라운드 = 한 관심사 = 한 커밋.** 스키마·린트·테스트·문서는 각각 다른 라운드다.
- 계약(타입·인터페이스)을 먼저 커밋하고 구현을 다음 커밋으로 낸다 — 리뷰 지점을 만든다.
- 구조 결정은 VSCode의 대응 개념(contribution point·command·service·extension host)을 따르고 ADR로 남긴다.
- 정해진 결정을 벗어난 판단은 커밋 메시지의 "확인 필요"에 스스로 신고한다.

## 제출 전

```
pnpm run check
```

typecheck → lint → lint:css → lint:config → test(패키지·contract·tooling) 순서다. 앞에서 걸리면 뒤를 안 돌린다.

- 새 실수 패턴을 발견하면 지적하지 말고 린트 규칙으로 만든다. 규칙에는 `message`로 대안을 적고 `tooling/eslint-rules/*.test.ts`에 valid/invalid를 둔다.
- 커밋 메시지는 한글 자연문. 첫 줄은 무엇을 왜 했는지, 본문에 "결정한 것 / 확인 필요".
