import type { ExtensionModule } from "#core/extensions";
import { filesystem } from "./filesystem";

/** 번들에 든 확장 전부. **배럴 순서가 켜는 순서다** — 메뉴 묶음도 이 순서로 놓인다. */
export const extensions: readonly ExtensionModule[] = [filesystem];
