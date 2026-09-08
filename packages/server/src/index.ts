import type { User } from "@contracts/index";

export function findUserById(users: User[], id: string): User | undefined {
  return users.find((u) => u.id === id);
}

export function firstUser(users: User[]): User {
  const user = users[0]; // noUncheckedIndexedAccess -> type is `User | undefined`
  if (!user) {
    throw new Error("No users");
  }
  return user;
}
