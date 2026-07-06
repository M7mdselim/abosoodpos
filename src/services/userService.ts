import { store } from "./store";
import type { User } from "@/types";

export const userService = {
  list: () => store.users,
  create: (data: Omit<User, "id">): User => {
    const user: User = { ...data, id: `u${Date.now()}` };
    store.users.unshift(user);
    return user;
  },
  update: (id: string, patch: Partial<User>) => {
    const idx = store.users.findIndex((u) => u.id === id);
    if (idx >= 0) store.users[idx] = { ...store.users[idx], ...patch };
  },
  remove: (id: string) => {
    store.users = store.users.filter((u) => u.id !== id);
  },
};
