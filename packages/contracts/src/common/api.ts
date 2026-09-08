import { z } from "zod";

/**
 * `GET /api/health` — 프로세스가 요청을 받을 수 있는 상태인지만 답한다.
 *
 * 워크스페이스 접근 가능 여부 같은 깊은 검사는 넣지 않는다. 헬스체크는 컨테이너
 * 오케스트레이터가 짧은 간격으로 부르므로 싸야 하고, 실패 원인을 밖에 알릴 이유도 없다.
 */
export const HealthResponse = z.object({ status: z.literal("ok") });
export type HealthResponse = z.infer<typeof HealthResponse>;
