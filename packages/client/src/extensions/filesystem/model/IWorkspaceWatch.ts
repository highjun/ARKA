import { createToken } from '#core/di';
/**
 * 워크스페이스의 파일·디렉터리 변경을 구독하는 통로.
 *
 * 계약은 화면이 필요한 것 하나뿐이다 — "이 경로들 중 하나가 바뀌었다". SSE 인지 WebSocket 인지,
 * 재연결을 어떻게 하는지는 Adapter 의 사정이라 여기 새지 않는다.
 *
 * `watch` 는 구독을 즉시 시작하고 해지 함수를 돌려준다. `Promise` 를 돌려주지 않는 이유는 연결이
 * 늦어도 부르는 쪽이 기다릴 이유가 없어서다 — 화면은 이미 보여줄 것을 다 보여준 상태고, 변경
 * 알림은 그 위에 나중에 얹히는 것이다.
 */

export type WorkspaceWatchUnsubscribe = () => void;

export const WorkspaceWatchToken = createToken<IWorkspaceWatch>("workspaceWatch");
/** 워크스페이스 변경 구독을 감싸는 Port 계약. */
export interface IWorkspaceWatch {
  /**
   * `paths` 중 하나라도 바뀌면 `onChange` 를 부른다 — 인자는 실제로 바뀐 경로들이다. 디렉터리면
   * 그 안의 목록이, 파일이면 내용이 바뀌었을 수 있다는 뜻이다.
   *
   * 반환한 함수를 부르면 구독을 끊는다. `paths` 가 빈 배열이면 아무것도 구독하지 않고, 아무 일도
   * 없는 해지 함수를 돌려준다 — 부르는 쪽이 빈 배열을 따로 걸러낼 필요가 없게.
   */
  watch(paths: readonly string[], onChange: (changed: readonly string[]) => void): WorkspaceWatchUnsubscribe;
}
