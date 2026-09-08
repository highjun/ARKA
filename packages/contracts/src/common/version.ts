import { z } from "zod";

/**
 * 현재 프로토콜 버전. 앱 버전과 독립적으로 움직이며, 구 클라이언트를 깨는
 * 변경일 때만 올린다.
 */
export const PROTOCOL_VERSION = 1;

/**
 * 모든 요청 바디가 확장하는 베이스.
 *
 * 특정 버전으로 고정하지 않고 정수로 받는다. 클라이언트가 사용자 기기에
 * 캐시되는 PWA라 서버는 구 버전 요청도 당분간 받아줘야 하는데, 고정해두면
 * 스키마 파싱 단계에서 걸러져 그럴 수 없다. 지원 여부는 서버가 판단한다.
 */
export const ProtocolVersioned = z.object({
  protocolVersion: z.number().int().positive(),
});
export type ProtocolVersioned = z.infer<typeof ProtocolVersioned>;
