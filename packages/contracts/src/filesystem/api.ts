import { z } from "zod";
import { ErrorBody } from "../common/errors";
import { FileEntryType } from "./types";

export const FileErrorBody = ErrorBody;
export type FileErrorBody = z.infer<typeof FileErrorBody>;

export const PathResult = z.object({ path: z.string() });
export type PathResult = z.infer<typeof PathResult>;

export const WriteFileRequest = z.object({
  path: z.string(),
  content: z.string(),
});
export type WriteFileRequest = z.infer<typeof WriteFileRequest>;

export const CreateEntryRequest = z.object({
  path: z.string(),
  type: FileEntryType,
});
export type CreateEntryRequest = z.infer<typeof CreateEntryRequest>;

export const MoveEntryRequest = z.object({
  from: z.string(),
  to: z.string(),
});
export type MoveEntryRequest = z.infer<typeof MoveEntryRequest>;

export const WatchEvent = z.object({ paths: z.array(z.string()) });
export type WatchEvent = z.infer<typeof WatchEvent>;
