import { createToken, type Disposable } from "#core/di";

/**
 * 사이드바 활동 하나의 id. 어떤 활동이 있는지는 Model이 모른다 — `IActivityBarRegistry`
 * (`modules/ShellModule/IActivityBarRegistry`)에 등록된 것이 곧 활동 목록이다. Model은 그중 무엇이 활성인지만
 * 안다. 닫힌 유니온 대신 `string`인 이유가 그것이다.
 */
export type ActivityId = string;

export const ActivityModelToken = createToken<IActivityModel>("activityModel");
/**
 * 지금 어느 활동이 활성인지, 그 값 하나만 갖는다.
 *
 * "같은 활동을 다시 고르면 닫힌다" 같은 판단은 여기 없다 — 그건 사용자 동작에 대한 반응 규칙이라
 * `IShellViewModel`의 커맨드가 계산해서 `setActiveActivityId`를 부른다. Model은 넘어온 값을 그대로
 * 반영할 뿐이다.
 */
export interface IActivityModel {
  readonly activeActivityId: ActivityId | null;
  setActiveActivityId(id: ActivityId | null): void;

  /** 상태가 바뀔 때마다 부른다. */
  onDidChange(listener: () => void): Disposable;
}
