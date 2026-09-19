import type { Container, InstanceId, InstanceMap, Lifetime } from "#core/di";

/** 물릴 것 하나. id와 타입이 `InstanceMap`에서 짝지어 움직인다. */
export type Registration = {
  [K in InstanceId]: {
    readonly id: K;
    readonly lifetime: Lifetime;
    readonly create: (container: Container) => InstanceMap[K];
  };
}[InstanceId];

/**
 * 확장 하나. **커널과 만나는 면이 이 값 하나다.**
 *
 * 매니페스트를 따로 두지 않는다 — 확장이 번들에 정적으로 들어 있고 셸이 뜨면 전부 켜지므로
 * "코드를 켜기 전에 읽어야 하는 것"이 없다.
 */
export interface ExtensionModule {
  readonly id: string;
  /** 1단계 — 자기 서비스와 ViewModel을 지도에 물린다. 여기서는 아무것도 꺼내지 않는다. */
  readonly provides?: readonly Registration[];
  /**
   * 2단계 — 꽂힐 자리를 꺼내 add한다. 모든 확장의 `provides`가 끝난 뒤라 여기서는 꺼내도 된다.
   * 부팅 때 돌아야 하는 것(파일 감시·소켓)은 여기서 `resolve`하면 그때 만들어져 켜진다.
   */
  readonly activate?: (container: Container) => void;
}

/** 켜다 실패한 확장 하나. 조용히 빠지면 왜 메뉴가 없는지 알 길이 없다. */
export interface ExtensionActivationFailure {
  readonly id: string;
  /** 어느 단계에서 터졌나 — 지도에 무는 중인지, 꽂는 중인지. */
  readonly phase: "provides" | "activate";
  readonly error: Error;
}

/** 켜기 결과. 셸은 이것을 보고 실패를 알린다. */
export interface ActivationResult {
  readonly activated: readonly string[];
  readonly failed: readonly ExtensionActivationFailure[];
}
