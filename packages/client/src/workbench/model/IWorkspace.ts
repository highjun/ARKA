import type { URI } from "#contracts";
import type { Disposable } from "#core/di";

declare module "#core/di" {
  /** `IWorkspace`를 컨테이너에서 꺼내는 자리. */
  interface InstanceMap {
    "arka.workbench.workspace": IWorkspace;
  }
}
/** 무엇이 작업 범위인가. **루트는 하나**고 서버 설정으로 고정된다 — 앱 안에서 바꾸지 않는다. */
export interface IWorkspace {
  readonly root: URI;
  /** 화면에 보이는 이름. 루트 디렉터리 이름이다. 서버에서 오므로 읽기 전엔 빈 문자열. */
  readonly name: string;
  /** 루트 기준 상대 경로를 절대 Uri로 만든다. 루트 밖을 가리키면 던진다. */
  resolve(relativePath: string): URI;
  /** 위의 반대. 루트 밖이면 `null`. */
  relativize(uri: URI): string | null;
  /** 부팅 때 한 번 — 서버에서 이름을 읽는다. 실패해도 던지지 않는다. */
  load(): Promise<void>;
  /** `name`이 서버에서 왔을 때 한 번 부른다. */
  onDidChange(listener: () => void): Disposable;
}
