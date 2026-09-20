import type { Container } from "#core/di";
import { runActivating } from "../registry/activation";
import type { ActivationResult, ExtensionActivationFailure, ExtensionModule, Registration } from "./ExtensionModule";

const asError = (thrown: unknown): Error => (thrown instanceof Error ? thrown : new Error(String(thrown)));

export const activateExtensions = (modules: readonly ExtensionModule[], container: Container): ActivationResult => {
  const failed: ExtensionActivationFailure[] = [];
  const failedIds = new Set<string>();

  for (const module of modules) {
    try {
      for (const registration of module.provides ?? []) {
        const { id, lifetime, create } = registration as Registration & { readonly create: (c: Container) => never };
        container.register(id, lifetime, create);
      }
    } catch (thrown) {
      failed.push({ id: module.id, phase: "provides", error: asError(thrown) });
      failedIds.add(module.id);
    }
  }

  for (const module of modules) {
    if (failedIds.has(module.id) || module.activate === undefined) continue;
    const activate = module.activate;
    try {
      runActivating(module.id, () => activate(container));
    } catch (thrown) {
      failed.push({ id: module.id, phase: "activate", error: asError(thrown) });
      failedIds.add(module.id);
    }
  }

  return {
    activated: modules.map((module) => module.id).filter((id) => !failedIds.has(id)),
    failed,
  };
};
