import { foldKeymap } from "@codemirror/language";
import type { KeyBinding } from "@codemirror/view";

export const fileExtensionOf = (path: string): string | undefined => {
  const name = path.split("/").pop() ?? path;
  const dot = name.lastIndexOf(".");
  if (dot <= 0) return undefined;
  return name.slice(dot + 1).toLowerCase();
};

const EXTENSION_KEYMAPS: Readonly<Record<string, readonly KeyBinding[]>> = {};

export const getKeymapForExtension = (extension: string | undefined): readonly KeyBinding[] => [
  ...foldKeymap,
  ...(extension === undefined ? [] : (EXTENSION_KEYMAPS[extension] ?? [])),
];
