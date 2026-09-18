import type { Disposable } from "#core/di";
import type { Descriptor, Registry } from "#core/registry";

/** 확장이 더하는 설정 한 칸. `type`이 `default`의 타입을 정한다 — 어긋나면 컴파일에서 잡힌다. */
export type SettingsDescriptor = Descriptor & {
  readonly title: string;
  /** 화면 폭에 따라 값이 갈리는가. 설정에 "기기" 개념을 두지 않기로 한 결정의 대응물이다. */
  readonly byViewportWidth?: boolean;
} & (
    | { readonly type: "boolean"; readonly default: boolean }
    | { readonly type: "number"; readonly default: number }
    | { readonly type: "string"; readonly default: string }
    | { readonly type: "enum"; readonly default: string; readonly options: readonly string[] }
  );

/** 값이 실제로 사는 곳. 지금은 localStorage, 나중엔 서버의 settings.json — 커널은 어느 쪽인지 모른다. */
export interface SettingsStore {
  /** 저장된 값 전부. 없으면 빈 객체. 깨진 값은 `ISettings`가 걸러 기본값으로 돌린다. */
  load(): Readonly<Record<string, unknown>>;
  save(values: Readonly<Record<string, unknown>>): void;
}

/**
 * 스키마를 들고 값을 읽고 쓴다. 확장은 `activate`에서 `schema.add(…)`로 자기 칸을 더한다.
 *
 * 값은 한 곳에 산다 — 기기별 값을 두지 않고, 화면 폭에 따라 갈리는 값만 둔다.
 */
export interface ISettings {
  readonly schema: Registry<SettingsDescriptor>;
  /**
   * 저장된 값이 스키마의 타입에 맞으면 그것, 아니면 `default`.
   * @throws DescriptorNotFoundError 등록 안 된 id다.
   */
  get<T>(id: string): T;
  /**
   * 저장하고 알린다.
   * @throws DescriptorNotFoundError 등록 안 된 id다 — 모르는 값이 쌓이지 않게 한다.
   */
  set(id: string, value: unknown): void;
  onDidChange(listener: (id: string) => void): Disposable;
}
