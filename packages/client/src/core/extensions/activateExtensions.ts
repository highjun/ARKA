import type { Container } from "#core/di";
import { runActivating } from "../registry/activation";
import { ExtensionDependencyError } from "./errors";
import type { ActivationResult, ExtensionActivationFailure, ExtensionModule, Registration } from "./ExtensionModule";

const asError = (thrown: unknown): Error => (thrown instanceof Error ? thrown : new Error(String(thrown)));

/** 기대는 확장이 앞에 오도록 늘어놓는다. 기댈 것이 없으면 준 순서 그대로다. */
const order = (
  modules: readonly ExtensionModule[],
  failed: ExtensionActivationFailure[],
): { readonly ordered: readonly ExtensionModule[]; readonly failedIds: Set<string> } => {
  const byId = new Map(modules.map((module) => [module.id, module]));
  const ordered: ExtensionModule[] = [];
  const failedIds = new Set<string>();
  const state = new Map<string, "visiting" | "done">();

  const fail = (module: ExtensionModule, dependsOn: string, reason: "missing" | "failed" | "cycle"): void => {
    failed.push({
      id: module.id,
      phase: "dependsOn",
      error: new ExtensionDependencyError(module.id, dependsOn, reason),
    });
    failedIds.add(module.id);
    state.set(module.id, "done");
  };

  const visit = (module: ExtensionModule): void => {
    if (state.get(module.id) === "done") return;
    state.set(module.id, "visiting");
    for (const dependsOn of module.dependsOn ?? []) {
      const dependency = byId.get(dependsOn);
      if (dependency === undefined) return fail(module, dependsOn, "missing");
      if (state.get(dependsOn) === "visiting") return fail(module, dependsOn, "cycle");
      visit(dependency);
      if (failedIds.has(dependsOn)) return fail(module, dependsOn, "failed");
    }
    state.set(module.id, "done");
    ordered.push(module);
  };

  for (const module of modules) visit(module);
  return { ordered, failedIds };
};

export const activateExtensions = (modules: readonly ExtensionModule[], container: Container): ActivationResult => {
  const failed: ExtensionActivationFailure[] = [];
  const { ordered, failedIds } = order(modules, failed);

  /** 기대는 확장이 앞 단계에서 넘어졌으면 이 확장도 켜지 않는다. */
  const blocked = (module: ExtensionModule): boolean => {
    const dependsOn = (module.dependsOn ?? []).find((id) => failedIds.has(id));
    if (dependsOn === undefined) return false;
    failed.push({
      id: module.id,
      phase: "dependsOn",
      error: new ExtensionDependencyError(module.id, dependsOn, "failed"),
    });
    failedIds.add(module.id);
    return true;
  };

  for (const module of ordered) {
    if (failedIds.has(module.id) || blocked(module)) continue;
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

  for (const module of ordered) {
    if (failedIds.has(module.id) || blocked(module) || module.activate === undefined) continue;
    const activate = module.activate;
    try {
      runActivating(module.id, () => activate(container));
    } catch (thrown) {
      failed.push({ id: module.id, phase: "activate", error: asError(thrown) });
      failedIds.add(module.id);
    }
  }

  return {
    activated: ordered.map((module) => module.id).filter((id) => !failedIds.has(id)),
    failed,
  };
};
