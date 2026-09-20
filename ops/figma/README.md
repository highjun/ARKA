# Figma 도구

**Figma 파일이 그림의 정본이다.** 이 셋은 그 파일을 **다시 그릴 수 있게** 한다 — 표 한 줄을
고치면 시트가 따라오고, 손으로 고친 것과 적힌 것이 갈라지지 않는다.

| 파일 | 하는 일 |
| --- | --- |
| `meta.js` | 세트마다 **설명 한 줄과 prop 표**. 스크립트가 아니라 데이터다 |
| `spec.js` | 세트 + `meta` → **스펙 시트 한 장**. 견본 블록·표·변형 덤프를 짠다 |
| `links.js` | 세트 이름 → **노드 id 표**를 뽑는다. 결과가 `links.json` |
| `links.json` | 그 표. 어느 스토리에 **어느 그림**을 겹칠지 가리킨다 |
| `compare.mjs` | 스토리와 그림을 나란히 놓고 **얼마나 다른지 센다** |
| `serve.mjs` | 플러그인이 위 스크립트들을 `fetch`할 수 있게 여는 서버 |

`serve.mjs`가 따로 있는 이유는 **Figma 플러그인의 `fetch`가 CORS를 보기 때문**이다.
`python3 -m http.server`로는 연결이 닿아도 "Failed to fetch"가 난다.

## 돌리는 법

```sh
node ops/figma/serve.mjs 9230
```

그리고 Figma Console MCP의 `figma_execute`에서:

```js
(0, eval)(await (await fetch("http://localhost:9230/tool/meta.js")).text());
(0, eval)(await (await fetch("http://localhost:9230/tool/spec.js")).text());
const { meta, spec } = globalThis.__arka;

await spec.boot(); // 변수와 텍스트 스타일을 한 번 읽는다
await meta.apply(); // 표의 설명을 각 세트의 description에 써 넣는다
await spec.sheet("Text"); // 세트 하나 → 시트 한 장
await spec.group("Menu"); // 부품은 meta의 `부품`이 정본 — 첫 줄이 `Menu/Root`
```

검사는 둘이다.

```js
await meta.audit(); // 표에 없는 축·속성 · 표에 없는 세트 · 루트 없는 컴파운드 · 루트에 겹친 prop
await spec.audit("01 Shared"); // 끊긴 인스턴스·겹침·고정폭 글자·스타일 없는 글자·루트에 뜬 것
```

## 걸리는 것

- **플러그인은 한 번에 29초다.** 시트 한 장이 5~20초라 **한 호출에 한두 장**만 한다.
  끊겨도 플러그인은 끝까지 도니, 다시 손대기 전에 상태부터 읽는다.
- **시트를 지우면 그 안에 주차된 컴포넌트도 같이 지워진다.** 지우기 전에 시트 안에
  컴포넌트가 있는지 센다.
- 포트는 매니페스트가 허용하는 `9223`–`9232` 안이어야 한다. 그 대역에 낡은 MCP 서버가
  떠 있으면 모든 호출이 29초로 늘어난다 — `ss -ltnp`로 먼저 본다.
- `가상: true`인 부품은 Figma에 노드가 없다(`Menu/Root`처럼 코드에만 있는 것).
  시트는 표만 세우고 견본은 건너뛴다.
- 컴파운드의 루트는 **`X/Root`** — Figma 세트 이름도, `meta`의 항목도, 시트의 첫 절도 그 이름이다.
  머리 항목 `X`는 설명·부품 목록만 들고 prop 표가 없다.

## 그림과 실제를 대조한다

**공식 길인 Code Connect는 못 쓴다** — Organization·Enterprise 전용이고 우리는 Professional이다.
대신 `storybook-addon-figma-sync`가 그림을 스토리 위에 겹쳐 주고, 어긋난 픽셀을 빨갛게 칠한다.

### 한 번만 하는 준비

1. Figma에서 개인 액세스 토큰을 받는다 — `Settings > Account > Personal access tokens`
2. `packages/client/.env.example`을 `.env`로 복사하고 `FIGMA_TOKEN=`에 값을 넣는다.
   **`.env`는 gitignore다** — 토큰은 저장소에 안 들어간다.

### 눈으로 보기

```sh
pnpm --filter client dev:storybook
```

스토리를 열고 툴바의 **Figma Sync** 패널에 그림 주소를 붙여넣는다. 주소는 `links.json`에 있다 —
`https://www.figma.com/design/<fileKey>/ARKASHIC?node-id=<default를 하이픈으로>`.
투명도를 움직여 겹쳐 보고, **Analyze Screenshot**으로 차이를 본다(나란히·겹쳐·차이만 셋).

### 한꺼번에 재기

```sh
node ops/figma/compare.mjs            # 스토리 전부
node ops/figma/compare.mjs Sidebar    # 이름으로 걸러서
```

닮음이 낮은 것부터 나온다. 그림이 없는 스토리는 **까닭과 함께** 건너뛴 목록에 남는다 —
조용히 빠지면 무엇을 안 봤는지 알 수 없다.

### 맞으면 기준을 만든다

사용자가 보고 승인한 스토리만 회귀 검사의 기준이 된다(→ `docs/CONVENTIONS.md`).

```sh
pnpm --filter client test:visual-regression -g "<스토리 id>" --update-snapshots
```

승인이 쌓이면 그 뒤로는 어긋남을 기계가 잡는다.

### 대조에서 걸리는 것

- 그림과 스토리의 **크기가 다르면 온통 빨갛다.** 애드온이 미리보기 틀을 그림 크기로 바꾸지만,
  스토리 데코레이터가 고정 크기를 주면 그것이 이긴다. `links.json`의 `w`·`h`에 맞춘다.
- 비교 전에 **둘 다 흰 배경에 합성한다**(투명 때문에 생기는 거짓 차이를 없애려고).
  다크로 그린 그림과 다크로 뜬 스토리는 둘 다 제 배경이 있어 괜찮다.
- 화면에서 빼고 싶은 것에는 `data-figma-sync-ignore="true"`를 단다.
