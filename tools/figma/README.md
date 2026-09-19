# Figma 도구

**Figma 파일이 그림의 정본이다.** 이 셋은 그 파일을 **다시 그릴 수 있게** 한다 — 표 한 줄을
고치면 시트가 따라오고, 손으로 고친 것과 적힌 것이 갈라지지 않는다.

| 파일 | 하는 일 |
| --- | --- |
| `meta.js` | 세트마다 **설명 한 줄과 prop 표**. 스크립트가 아니라 데이터다 |
| `spec.js` | 세트 + `meta` → **스펙 시트 한 장**. 견본 블록·표·변형 덤프를 짠다 |
| `serve.mjs` | 플러그인이 위 둘을 `fetch`할 수 있게 여는 서버 |

`serve.mjs`가 따로 있는 이유는 **Figma 플러그인의 `fetch`가 CORS를 보기 때문**이다.
`python3 -m http.server`로는 연결이 닿아도 "Failed to fetch"가 난다.

## 돌리는 법

```sh
node tools/figma/serve.mjs 9230
```

그리고 Figma Console MCP의 `figma_execute`에서:

```js
(0, eval)(await (await fetch("http://localhost:9230/tool/meta.js")).text());
(0, eval)(await (await fetch("http://localhost:9230/tool/spec.js")).text());
const { meta, spec } = globalThis.__arka;

await spec.boot(); // 변수와 텍스트 스타일을 한 번 읽는다
await meta.apply(); // 표의 설명을 각 세트의 description에 써 넣는다
await spec.sheet("Text"); // 세트 하나 → 시트 한 장
await spec.group("Menu", ["Menu/Trigger", "Menu/Content", "Menu/Item"]);
```

검사는 둘이다.

```js
meta.audit(); // 표에 없는 축·속성, 표에 없는 세트
spec.audit("01 Shared"); // 끊긴 인스턴스·겹침·고정폭 글자·스타일 없는 글자·루트에 뜬 것
```

## 걸리는 것

- **플러그인은 한 번에 29초다.** 시트 한 장이 5~20초라 **한 호출에 한두 장**만 한다.
  끊겨도 플러그인은 끝까지 도니, 다시 손대기 전에 상태부터 읽는다.
- **시트를 지우면 그 안에 주차된 컴포넌트도 같이 지워진다.** 지우기 전에 시트 안에
  컴포넌트가 있는지 센다.
- 포트는 매니페스트가 허용하는 `9223`–`9232` 안이어야 한다. 그 대역에 낡은 MCP 서버가
  떠 있으면 모든 호출이 29초로 늘어난다 — `ss -ltnp`로 먼저 본다.
- `가상: true`인 부품은 Figma에 노드가 없다(`Menu/Trigger`처럼 코드에만 있는 것).
  시트는 표만 세우고 견본은 건너뛴다.
