import type { Disposable } from "#core/di";

declare module "#core/di" {
  /** `IAppLifetime`을 컨테이너에서 꺼내는 자리. */
  interface InstanceMap {
    "arka.workbench.appLifetime": IAppLifetime;
  }
}
/**
 * 앱이 새로 떠야 하는 자리를 한곳에 모은다.
 *
 * 서버가 프로토콜 버전이 안 맞다고 하면 여기로 온다. 더티 탭이 있으면 떠나기 전에 묻는다.
 */
export interface IAppLifetime {
  /** 서버가 말하는 프로토콜 버전이 이 클라이언트와 다르다 — 캐시된 PWA가 낡았다. 못 읽었으면 `false`. */
  readonly isOutdated: boolean;
  /** 화면 구석에 띄우는 빌드 표시. 아직 못 읽었으면 빈 문자열. */
  readonly buildId: string;
  /** 부팅 때 한 번 — 서버 정보를 읽어 `isOutdated`·`buildId`를 채운다. 실패해도 던지지 않는다. */
  load(): Promise<void>;
  requestReload(reason: "versionMismatch" | "userRequested"): void;
  onDidChange(listener: () => void): Disposable;
}
