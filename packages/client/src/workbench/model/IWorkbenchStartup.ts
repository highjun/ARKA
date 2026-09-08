/**
 * 셸이 뜨고 지는 것에 맞춰 켜고 꺼야 하는 것 — 지금은 파일 감시 하나다.
 *
 * **셸은 무엇이 켜지는지 모른다.** 켜고 끄라고만 하고, 무엇을 켜는지는 조립부가 채운다.
 * VSCode의 `IWorkbenchContribution`(라이프사이클 단계에 맞춰 contrib이 스스로 시작)과 같은
 * 자리다.
 *
 * **Registry가 아닌 이유를 신고한다.** VSCode는 이걸 Registry로 두지만, 우리 Registry는
 * singleton이라 descriptor가 루트에서 등록된다. 그런데 켜야 할 대상(ViewModel)은 `scoped`라
 * 루트에서 resolve하면 화면이 보는 것과 **다른 인스턴스**를 켜게 된다. 그래서 스코프에서
 * resolve되는 서비스 하나로 둔다. 켤 것이 둘 이상 생기면 그때 Registry로 승격한다.
 */
export interface IWorkbenchStartup {
  /** 셸이 마운트될 때. */
  start(): void;
  /** 셸이 사라질 때. */
  stop(): void;
}
