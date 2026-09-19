import type { PaneId } from "./ITabLayout";

/**
 * 트리를 새로 시작할 때(첫 부팅, 마이그레이션, 전부 닫힘 이후) 쓰는 유일한 leaf의 id.
 *
 * `IShellViewModel`도 이 값을 쓴다(빈 트리의 기본 leaf를 만들 때) — 계약(`ITabLayout`)이 아니라
 * 순수 상수라 `share.ts`에 둔다(D7).
 */
export const ROOT_PANE_ID: PaneId = "root";
