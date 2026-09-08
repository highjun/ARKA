# ADR 0005: 세 패키지 모두 feature 우선으로 나눈다

## 결정:
- 레이어는 4개로 고정이지만 도메인은 계속 는다(filesystem → git → run → llm). 레이어 우선으로 나누면 `infra/`가 서로 무관한 것들의 창고가 되고, 도메인 하나를 들어내려면 네 폴더를 뒤져야 한다.
- 따라서 client와 server 모두 `features/<name>/` 아래에 그 도메인의 모든 레이어를 모은다. 도메인을 모르는 것(DI·설정·부팅)만 `core/`에 레이어로 남는다.

```
contracts/src/
  common/                 도메인을 가리지 않는 것 — uri.ts, errors.ts, version.ts
  <name>/                 도메인별 폴더
    types.ts              도메인 타입·에러 코드
    events.ts             이벤트
    api.ts                요청/응답 스키마
  index.ts                전부 re-export

client/src/
  core/                   기능 없음, 꽂을 자리만 — di/, transport/, types/
  features/<name>/
    model/                도메인 타입·규칙 + infra가 구현할 인터페이스 선언
    infra/                I/O 구현 (필요할 때만)
    viewmodel/            I<Name>VM.ts(계약) + <Name>VM.ts(구현)
    view/                 React 컴포넌트
    index.ts              공개 표면
  shared/ui/              UI 프리미티브·순수 유틸 — features를 모름
  app/                    진입점, 레이아웃, bootstrap

server/src/
  core/                   DI·설정·라이프사이클 — config.ts
  features/<name>/
    domain/               도메인 타입·규칙·에러
    infra/                DB·FS·외부 API 구현
    services/             유스케이스 (필요할 때만)
    transport/            HTTP 라우트, SSE
    index.ts              공개 표면
  index.ts                부팅
```

- 폴더 이름은 다르지만 역할이 대응한다: `view`↔`transport`(바깥과의 접점), `viewmodel`↔`services`(유스케이스 조율), `model`↔`domain`(도메인 규칙), `infra`↔`infra`(I/O 구현).
- 의존은 안쪽(`model`/`domain`)을 향한다. `infra`가 안쪽 인터페이스를 구현하고, 어느 구현이 꽂힐지는 `app`/`bootstrap`이 정한다.
- `index.ts`는 바깥이 실제로 부르는 것만 내보낸다. 내부 구현·에러 타입·유틸은 내보내지 않는다. 공개 표면이 좁아야 나중에 feature를 익스텐션으로 옮기는 게 이동 수준으로 끝난다.
- features 간 직접 import은 금지하고 DI나 이벤트로만 소통한다. `shared/`는 `features/`를 import할 수 없고, 공통 추출은 아래로만(`features → shared`) 한다.
- 빈 레이어를 미리 만들지 않는다. `infra/`·`services/`는 실제 I/O나 유스케이스가 생길 때 만든다.
- 파일 이름은 camelCase, React 컴포넌트만 PascalCase. 테스트는 대상 옆에 `*.test.ts`로 둔다.

## 기각:
- 서버를 레이어 우선으로 두기 — 레이어는 고정이고 도메인은 늘어서, `infra/`에 `localDiskFileSystem.ts`와 `llmClient.ts`가 나란히 쌓이고 `domain/errors.ts` 하나가 모든 도메인의 에러를 안게 된다.
- client와 server의 폴더 이름 통일 — `view`와 `transport`는 역할이 달라 같은 이름을 붙이면 오히려 헷갈린다. 대응 관계는 위에 표로 남긴다.
- 폴더를 미리 다 만들어 두기 — 빈 폴더는 "여기에 뭘 넣어야 하나"를 유발하고, 통과 함수만 있는 계층을 만든다.
- `core`·`shared`를 별도 패키지로 쪼개기 — ADR 0001의 "두 번째 클라이언트가 생길 때까지 보류"가 그대로 유효하다.

## 상태:
승인됨. ADE 문서 §6의 서버 레이어 구조를 대체한다.
