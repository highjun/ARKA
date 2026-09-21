export const PROTOCOL_VERSION = 1;

export const PROTOCOL_HEADER = "x-arka-protocol";

export const protocolHeaders = (): Record<string, string> => ({ [PROTOCOL_HEADER]: String(PROTOCOL_VERSION) });
