import { z } from "zod";

export const FileEntryType = z.enum(["dir", "file"]);
export type FileEntryType = z.infer<typeof FileEntryType>;

export const FileEntry = z.object({
  name: z.string(),
  type: FileEntryType,
});
export type FileEntry = z.infer<typeof FileEntry>;

export const DirectoryListing = z.object({
  path: z.string(),
  parent: z.string().nullable(),
  entries: z.array(FileEntry),
});
export type DirectoryListing = z.infer<typeof DirectoryListing>;

export const FileContent = z.object({
  path: z.string(),
  content: z.string(),
  truncated: z.boolean(),
  encoding: z.enum(["utf8", "binary"]),
});
export type FileContent = z.infer<typeof FileContent>;

export const FileErrorCode = z.enum([
  "NotFound",
  "NoPermission",
  "Exists",
  "NotADirectory",
  "IsADirectory",
  "Conflict",
  "Unavailable",
]);
export type FileErrorCode = z.infer<typeof FileErrorCode>;
