import type { InstanceId, InstanceMap } from "#core/di";

/**
 * 셸이 뜨고 지는 것에 맞춰 켜고 꺼야 하는 것 하나.
 *
 * **셸은 무엇이 켜지는지 모른다.** 켜고 끄라고만 하고, 무엇을 켜는지는 조립부가 채운다.
 * VSCode의 `IWorkbenchContribution`(라이프사이클 단계에 맞춰 contrib이 스스로 시작)과 같은
 * 자리다.
 */
export interface IWorkbenchStartup {
  /** 셸이 마운트될 때. */
  start(): void;
  /** 셸이 사라질 때. */
  stop(): void;
}

/** `InstanceMap`에서 `IWorkbenchStartup`인 것의 id만. */
type StartupInstanceId = { [K in InstanceId]: InstanceMap[K] extends IWorkbenchStartup ? K : never }[InstanceId];

/**
 * **descriptor가 함수가 아니라 id를 담는 이유.** Registry는 singleton이라 descriptor가
 * 루트에서 등록되는데, 켤 대상은 `scoped`인 것을 쓴다. 루트에서 미리 resolve해 담아 두면
 * 화면이 보는 것과 **다른 인스턴스**를 켜게 된다. id만 담아 두면 스코프를 가진 쪽이
 * 그때 resolve한다.
 */
export type WorkbenchStartupDescriptor = {
  readonly id: string;
  readonly instanceId: StartupInstanceId;
};

declare module "#core/di" {
  /** `IWorkbenchStartupRegistry`를 컨테이너에서 꺼내는 자리. */
  interface InstanceMap {
    "arka.workbench.startupRegistry": IWorkbenchStartupRegistry;
  }
}
/** 셸 수명주기에 얹을 것들의 기여 지점. VSCode의 `IWorkbenchContributionsRegistry`에 해당한다. */
export interface IWorkbenchStartupRegistry {
  /** descriptor 등록. 같은 ID로 재등록 불가. */
  add(descriptor: WorkbenchStartupDescriptor): void;
  /** 조회. 없으면 에러. */
  get(id: string): WorkbenchStartupDescriptor;
  /** 조회 시도. 없으면 `undefined`. */
  tryGet(id: string): WorkbenchStartupDescriptor | undefined;
  /** 등록된 전체 목록 반환. */
  list(): readonly WorkbenchStartupDescriptor[];
}
