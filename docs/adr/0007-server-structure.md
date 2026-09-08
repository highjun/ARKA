# ADR 0007: 서버와 contracts는 feature 우선으로 나눈다

## 결정:

레이어는 고정이지만 도메인은 계속 는다(filesystem → git → run → llm). 레이어 우선으로 나누면 `infra/`가 서로 무관한 것들의 창고가 되고, 도메인 하나를 들어내려면 네 폴더를 뒤져야 한다. 따라서 `features/<name>/` 아래에 그 도메인의 모든 레이어를 모으고, 도메인을 모르는 것(설정·부팅)만 `core/`에 레이어로 남긴다.

```
server/src/
  core/                   설정·라이프사이클 — config.ts
  features/<name>/
    domain/               도메인 타입·규칙·에러
    infra/                DB·FS·외부 API 구현
    services/             유스케이스 (필요할 때만)
    transport/            HTTP 라우트, SSE
    index.ts              공개 표면
  index.ts                부팅

contracts/src/
  common/                 도메인을 가리지 않는 것 — uri.ts, errors.ts, version.ts
  <name>/                 도메인별 폴더
    types.ts              도메인 타입·에러 코드
    events.ts             이벤트
    api.ts                요청/응답 스키마
  index.ts                전부 re-export
```

### 계층

```
Transport → (Service) → Domain ← Infra
```

괄호는 생략 가능하다는 뜻이다. **빈 레이어를 미리 만들지 않는다** — `services/`는 실제 유스케이스가 생길 때 만든다.

의존은 안쪽(`domain`)을 향한다. `infra`가 안쪽 인터페이스를 구현하고, 어느 구현이 꽂힐지는 `index.ts`의 부팅부가 정한다.

- `index.ts`는 바깥이 실제로 부르는 것만 내보낸다. 내부 구현·에러 타입·유틸은 내보내지 않는다
- features 간 직접 import은 금지하고 이벤트로만 소통한다
- 파일 이름은 camelCase. 테스트는 대상 옆에 `*.test.ts`로 둔다

### 클라이언트와의 대응

폴더 이름은 다르지만 역할이 대응한다.

| 클라이언트 | 서버 | 역할 |
|---|---|---|
| `view` | `transport` | 바깥과의 접점 |
| `viewmodel` | `services` | 유스케이스 조율 |
| `model` | `domain` | 도메인 규칙 |
| `infra` | `infra` | I/O 구현 |

### contracts

`client`·`server`가 공유하는 스키마와 타입만 둔다. zod 스키마가 원본이고 타입은 `z.infer`로 뽑는다. `contracts`는 `client`·`server`를 import하지 않는다.

## 기각:
- 서버를 레이어 우선으로 두기 — 레이어는 고정이고 도메인은 늘어서, `infra/`에 `localDiskFileSystem.ts`와 `llmClient.ts`가 나란히 쌓이고 `domain/errors.ts` 하나가 모든 도메인의 에러를 안게 된다.
- client와 server의 폴더 이름 통일 — `view`와 `transport`는 역할이 달라 같은 이름을 붙이면 오히려 헷갈린다. 대응 관계는 위에 표로 남긴다.
- 폴더를 미리 다 만들어 두기 — 빈 폴더는 "여기에 뭘 넣어야 하나"를 유발하고, 통과 함수만 있는 계층을 만든다.

## 상태:

승인됨. ADE 문서 §6의 서버 레이어 구조를 대체한다. [ADR 0005](0005-client-structure.md)에서 분리해 온 것이며 새 결정은 넣지 않았다.

현재 코드와 다른 것:

1. **`services/`가 서버 전체에 없다.** `transport`가 `infra`를 직접 부른다. 위 구조가 이를 허용하지만("필요할 때만"), **언제 필요한지의 조건이 아직 문장으로 정해지지 않았다.**
2. **`domain/`에는 `filesystem/domain/errors.ts` 하나뿐이다** — `FileError` 클래스. 인터페이스도 순수 함수도 없고, 서버 전체에 `implements`가 0건이다. 서버 `infra`는 자유 함수라 구현할 인터페이스가 없다. 클라이언트의 포트/어댑터 구조와 비대칭이며, 이 비대칭을 유지할지는 정해지지 않았다.
3. `features/static/`에는 `domain/`이 없다. 도메인 개념이 없어서다 — "빈 레이어를 미리 만들지 않는다"에 부합한다.
4. **클라이언트가 `contracts`를 한 번도 import하지 않는다.** 사용 0건이고 클라이언트가 같은 타입을 자체 재정의한다. `contracts`는 현재 사실상 서버 전용이다.
