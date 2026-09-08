import { z } from "zod";

/**
 * `GET /api/health` — 프로세스가 요청을 받을 수 있는 상태인지만 답한다.
 *
 * 워크스페이스 접근 가능 여부 같은 깊은 검사는 넣지 않는다. 헬스체크는 컨테이너
 * 오케스트레이터가 짧은 간격으로 부르므로 싸야 하고, 실패 원인을 밖에 알릴 이유도 없다.
 */
export const HealthResponse = z.object({ status: z.literal("ok") });
export type HealthResponse = z.infer<typeof HealthResponse>;

/**
 * `GET /api/version` — 지금 서빙 중인 서버가 언제 떴는지와 프로토콜 버전. 프로토콜 헤더 없이 부를 수
 * 있는 둘(`/api/health`와 이것) 중 하나다 — 낡은 클라이언트도 자기가 낡았다는 것을 알아야 한다.
 */
export const VersionResponse = z.object({
  builtAt: z.string(),
  /** 서버가 지금 말하는 프로토콜 버전. 클라이언트가 자기 `PROTOCOL_VERSION`과 비교해 낡았는지 안다. */
  protocolVersion: z.number().int().positive(),
  /** 워크스페이스 루트 디렉터리 이름. 경로 전체는 주지 않는다 — 서버가 어디에 뿌리내렸는지가 화면에 새지 않게. */
  workspaceName: z.string(),
});
export type VersionResponse = z.infer<typeof VersionResponse>;
