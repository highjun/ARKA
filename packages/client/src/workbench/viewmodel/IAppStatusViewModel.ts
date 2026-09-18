import type { Disposable } from "#core/di";

declare module "#core/di" {
  /** `IAppStatusViewModel`를 컨테이너에서 꺼내는 자리. */
  interface InstanceMap {
    "arka.workbench.appStatusViewModel": IAppStatusViewModel;
  }
}
/** 앱 자체의 상태 — 낡은 클라이언트 띠와 워크스페이스 이름. 만들어지면 서버 정보를 읽기 시작한다. */
export interface IAppStatusViewModel extends Disposable {
  /** 워크스페이스 이름 — VSCode 창 제목의 폴더 이름 자리. 아직 못 읽었으면 빈 문자열. */
  readonly workspaceName: string;
  /** 화면 구석에 띄울 빌드 표시. 아직 못 읽었거나 실패했으면 빈 문자열이다. */
  readonly buildId: string;
  /** 서버가 말하는 프로토콜 버전이 이 클라이언트의 것과 다르다 — 캐시된 PWA가 낡았다. 못 읽었으면 `false`. */
  readonly isOutdated: boolean;
  /** 앱을 다시 불러온다. 낡은 클라이언트 띠의 버튼이 부른다. */
  reload(): void;
}
