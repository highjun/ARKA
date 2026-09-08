import type { User } from "@contracts/index";
import { DEFAULT_ROLE } from "@contracts/index";

export function createUser(id: string, name: string): User {
  return { id, name, role: DEFAULT_ROLE };
}
