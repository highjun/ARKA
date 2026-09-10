import type { Exec } from "./cloudflared.ts";
import type { FetchLike } from "./cloudflare.ts";

/**
 * 배포가 바깥과 닿는 **모든 지점**. 여기 없는 것은 순수 계산이다.
 *
 * 하나로 묶는 이유는 `up`·`down`이 여덟 가지 부작용을 쓰는데 인자로 늘어놓으면 호출부가
 * 읽히지 않아서다. 저수준(`cloudflare.ts`·`cloudflared.ts`)은 이 타입을 **모른다** —
 * 그래야 그쪽 테스트가 가짜 하나로 끝난다.
 */
export interface FsPort {
  readonly exists: (path: string) => boolean;
  /** 심링크를 편 실경로. 없으면 `undefined` — 끊어진 심링크를 유령으로 잡기 위해 필요하다. */
  readonly realpath: (path: string) => string | undefined;
  readonly readFile: (path: string) => string;
  readonly writeFile: (path: string, content: string) => void;
  readonly mkdir: (path: string) => void;
  readonly rename: (from: string, to: string) => void;
  readonly chmod: (path: string, mode: number) => void;
  readonly rm: (path: string) => void;
}

/** 배포가 쓰는 포트 묶음. */
export interface Ports {
  readonly exec: Exec;
  readonly fetch: FetchLike;
  readonly fs: FsPort;
  /** 사람이 읽는 진행 상황. stdout이 아니라 stderr로 간다 — 결과와 섞이지 않게. */
  readonly log: (message: string) => void;
  /** 생성물에 박히는 시각. 고정할 수 있어야 렌더 결과가 결정적이다. */
  readonly now: () => string;
  readonly sleep: (ms: number) => Promise<void>;
  /** 켜면 **바깥을 바꾸지 않는다** — 무엇을 할지만 찍는다. */
  readonly dryRun: boolean;
}
