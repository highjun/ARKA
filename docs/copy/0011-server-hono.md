# ADR 0011: 서버 프레임워크는 Hono

## 결정:
- HTTP는 **Hono**로 쓰고, Node에서는 `@hono/node-server`로 띄운다.
- 파일 감시는 Hono의 `streamSSE`를 그대로 쓴다 — SSE가 이 앱의 유일한 푸시 경로다.
- 에러는 `app.onError` 한 곳에서 도메인 에러·errno를 HTTP 상태로 바꾼다.

## 기각:
- Express — 미들웨어 타입이 약해 `req`/`res`에 임의 필드가 붙는 것을 컴파일러가 못 막는다. SSE도 직접 헤더를 다뤄야 한다.
- Fastify — 자체 JSON Schema 검증 체계가 있는데 우리는 zod를 쓴다([ADR 0007](0007-server-structure.md)). 검증이 두 벌이 되거나 한쪽을 꺼야 한다.
- 프레임워크 없이 `node:http` — 라우팅·본문 파싱을 직접 만들게 되고, 그건 이 앱의 관심사가 아니다.

## 상태:
승인됨. Hono는 표준 `Request`/`Response`를 쓰므로, 나중에 다른 런타임으로 옮겨도 핸들러가 그대로 간다.
