/**
 * id와 계약을 잇는 지도. **비어 있는 채로 시작하고 각 확장이 자기 자리에서 한 줄씩 더한다.**
 *
 * ```ts
 * declare module "#core/di" {
 *   interface InstanceMap {
 *     "arka.filesystem.workspaceFiles": IWorkspaceFiles;
 *   }
 * }
 * ```
 *
 * 키는 `arka.<확장>.<이름>`으로 짓는다 — 전역 이름 공간이라 겹치면 조용히 덮인다.
 * 같은 키에 서로 다른 타입을 선언하면 그것은 TypeScript가 잡는다.
 */
// eslint-disable-next-line @typescript-eslint/no-empty-object-type -- 선언 병합의 뿌리라 비어 있어야 한다
export interface InstanceMap {}

/** 컨테이너가 꺼낼 수 있는 id 전부. 오타는 여기서 걸린다. */
export type InstanceId = keyof InstanceMap;
