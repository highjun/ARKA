import { PROTOCOL_HEADER, PROTOCOL_VERSION } from "#contracts";

export const apiHeaders = (): Record<string, string> => ({ [PROTOCOL_HEADER]: String(PROTOCOL_VERSION) });
