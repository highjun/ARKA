import path from "node:path";

/**
 * 워크스페이스 — 앱 수준 개념이다. 파일·검색·git·에이전트 툴이 전부 같은 루트를 본다.
 *
 * 경로 문자열을 여기저기 넘기는 대신 이 객체 하나를 넘긴다. 지금은 루트 하나뿐이지만 여러
 * 워크스페이스(폴더 여러 개)가 생기면 여기서 갈린다.
 */
export interface IWorkspace {
  /** `realpath`를 거친 절대경로. */
  readonly root: string;
  /** 화면에 보이는 이름 — 루트 디렉터리 이름. */
  readonly name: string;
}

export const createWorkspace = (root: string): IWorkspace => ({ root, name: path.basename(root) || root });
