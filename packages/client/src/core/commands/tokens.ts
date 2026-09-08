import { createToken } from "#core/di";
import type { ICommandCenterRegistry } from "./ICommandCenterRegistry";

export const CommandCenterRegistryToken =
  createToken<ICommandCenterRegistry>("commandCenterRegistry");
