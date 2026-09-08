export type UserRole = "admin" | "member";

export interface User {
  id: string;
  name: string;
  role: UserRole;
}

export const DEFAULT_ROLE: UserRole = "member";
