import type { Container, InstanceId, InstanceMap, Lifetime } from "#core/di";

export type Registration = {
  [K in InstanceId]: {
    readonly id: K;
    readonly lifetime: Lifetime;
    readonly create: (container: Container) => InstanceMap[K];
  };
}[InstanceId];

export interface ExtensionModule {
  readonly id: string;
  /** 먼저 켜져 있어야 하는 확장의 id. 다른 확장의 타입을 import하면 여기 적는다 — 구조 테스트가 대조한다. */
  readonly dependsOn?: readonly string[];
  readonly provides?: readonly Registration[];
  readonly activate?: (container: Container) => void;
}

export interface ExtensionActivationFailure {
  readonly id: string;
  readonly phase: "dependsOn" | "provides" | "activate";
  readonly error: Error;
}

export interface ActivationResult {
  readonly activated: readonly string[];
  readonly failed: readonly ExtensionActivationFailure[];
}
