import type { Container } from "#core/di";
import { runActivating } from "../registry/activation";
import type { ActivationResult, ExtensionActivationFailure, ExtensionModule, Registration } from "./ExtensionModule";

const asError = (thrown: unknown): Error => (thrown instanceof Error ? thrown : new Error(String(thrown)));

/**
 * 확장 전부를 켠다. 셸이 그려지기 전에 한 번 돈다.
 *
 * 두 단계로 돈다 — 모든 확장의 `provides`를 먼저 물리고, 그 뒤에 `activate`를 차례로 부른다.
 * 그래서 반쯤 지어진 컨테이너를 보는 확장이 없다.
 *
 * 하나가 던져도 멈추지 않는다 — 그 확장만 실패 목록에 오르고 나머지는 그대로 뜬다.
 * 던진 시점까지 `add`한 것은 남는다. `add`가 던지는 경우는 id 중복뿐이라 부팅 때 바로 드러난다.
 *
 * 배럴 순서가 곧 등록 순서다. 기여 지점은 등록만 하고 실행하지 않으므로 순서에 뜻이 없다.
 */
export const activateExtensions = (modules: readonly ExtensionModule[], container: Container): ActivationResult => {
  const failed: ExtensionActivationFailure[] = [];
  const failedIds = new Set<string>();

  for (const module of modules) {
    try {
      for (const registration of module.provides ?? []) {
        // 매핑 유니온이라 id·create 짝은 각 항목 안에서 이미 맞는다 — 여기서만 넓힌다.
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
