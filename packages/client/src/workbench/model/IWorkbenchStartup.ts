import { createToken, type Token } from '#core/di';
import type { DescriptorMatch } from '#core';

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

/**
 * **descriptor가 함수가 아니라 토큰을 담는 이유.** Registry는 singleton이라 descriptor가
 * 루트에서 등록되는데, 켤 대상은 `scoped`인 것을 쓴다. 루트에서 미리 resolve해 담아 두면
 * 화면이 보는 것과 **다른 인스턴스**를 켜게 된다. 토큰만 담아 두면 스코프를 가진 쪽이
 * 그때 resolve한다.
 */
export type WorkbenchStartupDescriptor = {
  readonly id: string;
  readonly token: Token<IWorkbenchStartup>;
};

export const WorkbenchStartupRegistryToken =
  createToken<IWorkbenchStartupRegistry>('workbenchStartupRegistry');
/** 셸 수명주기에 얹을 것들의 기여 지점. VSCode의 `IWorkbenchContributionsRegistry`에 해당한다. */
export interface IWorkbenchStartupRegistry {
  /** descriptor 등록. 같은 ID로 재등록 불가. */
  add(descriptor: WorkbenchStartupDescriptor): void;
  /** 조회. 없으면 에러. */
  get(id: string): WorkbenchStartupDescriptor;
  /** 조회 시도. 없으면 `undefined`. */
  tryGet(id: string): WorkbenchStartupDescriptor | undefined;
  /** 등록된 전체 목록 반환. */
  list(): WorkbenchStartupDescriptor[];
  /** ID 패턴 조회. 파라미터와 함께 리스트로 반환. */
  match(id: string): DescriptorMatch<WorkbenchStartupDescriptor>[];
}
