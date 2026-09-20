import type { ExtensionModule } from "#core/extensions";
import { filesystem } from "./filesystem";

export const extensions: readonly ExtensionModule[] = [filesystem];
