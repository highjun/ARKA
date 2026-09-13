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
  /**
   * 서버가 **읽는** 헤더 이름. 버전만으로는 모자라다 — 이름이 바뀌면 구 클라이언트의 요청은
   * 서버 눈에 "헤더 없음"이라 426인데 양쪽 버전은 여전히 같아, 낡았다는 것을 스스로 알 수 없다
   * (2026-09-13 개명에서 실제로 겪었다).
   */
  protocolHeader: z.string().min(1),
  /** 워크스페이스 루트 디렉터리 이름. 경로 전체는 주지 않는다 — 서버가 어디에 뿌리내렸는지가 화면에 새지 않게. */
  workspaceName: z.string(),
  /**
   * 이 이미지를 만든 커밋. **없을 수 있다** — 소스에서 바로 띄우면 이미지가 없다.
   *
   * 더러운 트리에서 빌드하면 `-dirty`가 붙는다. 배포된 것이 이력의 어느 지점인지 묻는 유일한 길이다.
   */
  gitSha: z.string().min(1).optional(),
});
export type VersionResponse = z.infer<typeof VersionResponse>;
