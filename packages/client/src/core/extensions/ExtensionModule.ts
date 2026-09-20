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
  readonly provides?: readonly Registration[];
  readonly activate?: (container: Container) => void;
}

export interface ExtensionActivationFailure {
  readonly id: string;
  readonly phase: "provides" | "activate";
  readonly error: Error;
}

export interface ActivationResult {
  readonly activated: readonly string[];
  readonly failed: readonly ExtensionActivationFailure[];
}
