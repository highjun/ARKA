import { extensionMapData, fileIconMapData, filenameMapData } from "./data";

export type FileIconId = keyof typeof fileIconMapData;

export const FILE_ICON_MAP: Record<FileIconId, string> = fileIconMapData;
export const EXTENSION_MAP = extensionMapData as Record<string, FileIconId>;
export const FILENAME_MAP = filenameMapData as Record<string, FileIconId>;

export const fileIconIdOf = (name: string): FileIconId => {
  const lower = name.toLowerCase();

  const byFilename = FILENAME_MAP[lower];
  if (byFilename !== undefined) return byFilename;
  if (lower.endsWith(".lock")) return "fileTypeLock";

  const dotIndex = lower.indexOf(".");
  if (dotIndex < 0) return "fileTypeDefault";

  const segments = lower.slice(dotIndex + 1).split(".");
  for (let i = 0; i < segments.length; i += 1) {
    const byExtension = EXTENSION_MAP[segments.slice(i).join(".")];
    if (byExtension !== undefined) return byExtension;
  }
  return "fileTypeDefault";
};
