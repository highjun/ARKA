/**
 * 현재 프로토콜 버전. 앱 버전과 독립적으로 움직이며, 구 클라이언트를 깨는 변경일 때만 올린다.
 *
 * 클라이언트는 모든 `/api/*` 요청에 `PROTOCOL_HEADER`로 이 값을 싣고, 서버는 지원하지 않는
 * 값(또는 없는 값)에 `VersionMismatch`(426)로 답한다. 지원 여부는 서버가 판단한다 — 클라이언트가
 * 사용자 기기에 캐시되는 PWA라 구 버전 요청도 당분간 받아줘야 하기 때문이다.
 *
 * @see docs/adr/0017-protocol-header.md
 */
export const PROTOCOL_VERSION = 1;

/** 요청 헤더 이름. 값은 양의 정수 문자열. */
export const PROTOCOL_HEADER = "x-ade-protocol";
