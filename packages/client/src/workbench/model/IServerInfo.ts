import { createToken } from '#core/di';

/** 부팅 때 한 번 읽는다 — 서버가 바뀌면 새로고침해야 갱신된다. */
export type ServerInfo = {
  /** 서버가 뜬 시각(ISO). 화면 구석의 빌드 표시에 쓴다. */
  readonly builtAt: string;
  /** 서버가 말하는 프로토콜 버전. 클라이언트의 `PROTOCOL_VERSION`과 다르면 이 클라이언트는 낡은 것이다. */
  readonly protocolVersion: number;
  /** 서버가 읽는 헤더 이름. 클라이언트의 `PROTOCOL_HEADER`와 다르면 버전이 같아도 낡은 것이다. */
  readonly protocolHeader: string;
  /** 워크스페이스 루트 디렉터리 이름. 창 제목처럼 보여 준다. */
  readonly workspaceName: string;
  /** 이 이미지를 만든 커밋. 소스에서 바로 띄우면 없다. 더러운 트리면 `-dirty`가 붙는다. */
  readonly gitSha?: string;
};

export const ServerInfoToken = createToken<IServerInfo>('serverInfo');
/**
 * 서버에게 "너는 누구냐"를 묻는다 — 언제 떴고 어떤 프로토콜을 말하는지.
 *
 * 진단용이지 기능이 아니다 — 실패하면 `null`을 주고 화면은 그대로 돌아야 한다. 그래서 던지지 않는다.
 * 프로토콜 헤더 없이 부를 수 있는 엔드포인트라(→ ADR 0017) 낡은 클라이언트도 이 답은 받는다.
 */
export interface IServerInfo {
  load(): Promise<ServerInfo | null>;
}
