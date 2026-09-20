import { z } from "zod";

export const ErrorBody = z.object({
  code: z.string(),
  message: z.string(),
});
export type ErrorBody = z.infer<typeof ErrorBody>;

export const ProtocolErrorCode = z.enum(["VersionMismatch", "BadRequest", "Internal"]);
export type ProtocolErrorCode = z.infer<typeof ProtocolErrorCode>;

export const ProtocolErrorBody = ErrorBody.extend({
  code: ProtocolErrorCode,
  supported: z.array(z.number().int().positive()).optional(),
});
export type ProtocolErrorBody = z.infer<typeof ProtocolErrorBody>;
