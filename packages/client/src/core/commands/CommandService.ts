import { Collection, DescriptorNotFoundError, Registry } from "#core/registry";
import type { ActionDescriptor, ContextDescriptor, Keybinding, MenuItem } from "./descriptors";
import type { ICommandService } from "./ICommandService";
import { normalizeKeybinding } from "./normalizeKeybinding";

/** 사용자 재정의가 사는 곳. 지금은 localStorage, 나중엔 서버의 settings.json — 커널은 어느 쪽인지 모른다. */
export interface KeybindingOverridesStore {
  load(): Readonly<Record<string, string | null>>;
  save(overrides: Readonly<Record<string, string | null>>): void;
}

/** `ICommandService`의 유일한 구현체. 저장소와 오류 보고는 포트로 받는다 — core는 알림을 모른다. */
export class CommandService implements ICommandService {
  readonly actions = new Registry<ActionDescriptor>();
  readonly contexts = new Registry<ContextDescriptor>();
  readonly keybindings = new Collection<Keybinding>();
  readonly menus = new Collection<MenuItem>();
  readonly #overrides: Map<string, string | null>;
  readonly #store: KeybindingOverridesStore;
  readonly #reportError: (error: Error) => void;

  /** 생성 시점에 재정의를 읽어 둔다 — 부팅 뒤 따로 부를 것이 없다. */
  constructor({
    overridesStore,
    reportError,
  }: {
    overridesStore: KeybindingOverridesStore;
    reportError: (error: Error) => void;
  }) {
    this.#store = overridesStore;
    this.#reportError = reportError;
    this.#overrides = new Map(Object.entries(overridesStore.load()));
  }

  /** 읽기 전용 뷰. 바꾸는 길은 `setKeybinding`뿐이다. */
  get overrides(): ReadonlyMap<string, string | null> {
    return this.#overrides;
  }

  /** 재정의를 쓰고 저장한다. */
  setKeybinding(actionId: string, keybinding: string | null): void {
    this.#overrides.set(actionId, keybinding);
    this.#store.save(Object.fromEntries(this.#overrides));
  }

  /**
   * 기본값마다 재정의를 덮어 실효 키를 구해 비교한다. 기본값이 없는 명령에 재정의만 있으면 그것도 맞춘다.
   * 여러 개가 맞으면 먼저 담긴 것 — `when`이 서로 겹치지 않게 등록하는 것이 전제다.
   */
  matchKeybinding(event: KeyboardEvent): Keybinding | undefined {
    const pressed = normalizeKeybinding(event);
    for (const binding of this.keybindings.list()) {
      const effective = this.#overrides.has(binding.actionId)
        ? this.#overrides.get(binding.actionId)
        : binding.keybinding;
      if (effective !== pressed) continue;
      if (binding.when !== undefined && !binding.when(this.contexts)) continue;
      return { ...binding, keybinding: effective };
    }
    const bound = new Set(this.keybindings.list().map((binding) => binding.actionId));
    for (const [actionId, keybinding] of this.#overrides) {
      if (!bound.has(actionId) && keybinding === pressed) return { keybinding, actionId };
    }
    return undefined;
  }

  /** 낸 확장 순서(배럴 순서)로 묶고, 그 안에서 `order`. 켜는 중이 아닐 때 담긴 것(커널)은 맨 앞이다. */
  matchMenuItems(menuId: string): readonly MenuItem[] {
    return this.menus
      .entries()
      .filter(({ item }) => item.menuId === menuId && (item.when === undefined || item.when(this.contexts)))
      .sort((a, b) => {
        const byActivation = (a.activation?.index ?? -1) - (b.activation?.index ?? -1);
        return byActivation !== 0 ? byActivation : (a.item.order ?? 0) - (b.item.order ?? 0);
      })
      .map(({ item }) => item);
  }

  /** 맞는 키바인딩이 있으면 그 명령을 실행하고 `true`. */
  dispatchKeydown(event: KeyboardEvent): boolean {
    const matched = this.matchKeybinding(event);
    if (matched === undefined) return false;
    this.execute(matched.actionId);
    return true;
  }

  /** 모르는 id도, 실행 중 던진 것도 보고로 끝난다 — 트리거 쪽에 예외가 새지 않는다. */
  execute(actionId: string, context?: unknown): void {
    const action = this.actions.tryGet(actionId);
    if (action === undefined) {
      this.#reportError(new DescriptorNotFoundError(actionId));
      return;
    }
    try {
      action.execute(context);
    } catch (error) {
      this.#reportError(error instanceof Error ? error : new Error(String(error)));
    }
  }
}
