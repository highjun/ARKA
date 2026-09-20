import { z } from "zod";

export const HealthResponse = z.object({ status: z.literal("ok") });
export type HealthResponse = z.infer<typeof HealthResponse>;

export const VersionResponse = z.object({
  builtAt: z.string(),
  protocolVersion: z.number().int().positive(),
  protocolHeader: z.string().min(1),
  workspaceName: z.string(),
  gitSha: z.string().min(1).optional(),
});
export type VersionResponse = z.infer<typeof VersionResponse>;
