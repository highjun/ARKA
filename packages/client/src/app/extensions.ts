import type { ExtensionModule } from "#core/extensions";
import { filesystem } from "#extensions/filesystem";

export const extensions: readonly ExtensionModule[] = [filesystem];
