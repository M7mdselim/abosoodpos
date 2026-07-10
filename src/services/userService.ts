import { store } from "./store";
import type { User } from "@/types";
import { backendService } from "./backendService";

export const userService = {
  list: () => store.users,
  create: (data: Omit<User, "id">): User => {
    const user: User = { ...data, id: `u${Date.now()}` };
    store.users = [user, ...store.users];
    backendService.createUser(user).catch((err) => console.error("Error creating user in backend:", err));
    return user;
  },
  update: (id: string, patch: Partial<User>) => {
    let updatedUser: User | null = null;
    store.users = store.users.map((u) => {
      if (u.id === id) {
        const updated = { ...u, ...patch };
        updatedUser = updated;
        return updated;
      }
      return u;
    });
    if (updatedUser) {
      backendService.updateUser(id, updatedUser).catch((err) => console.error("Error updating user in backend:", err));
    }
  },
  remove: (id: string) => {
    store.users = store.users.filter((u) => u.id !== id);
    backendService.deleteUser(id).catch((err) => console.error("Error deleting user from backend:", err));
  },
};
