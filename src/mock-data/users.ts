import type { User } from "@/types";

export const mockUsers: User[] = [
  { id: "u1", name: "Admin User", role: "admin", status: "active" },
  { id: "u2", name: "Ahmed (Cashier)", role: "cashier", status: "active" },
  { id: "u3", name: "Sami (Cashier)", role: "cashier", status: "active" },
  { id: "u4", name: "Khaled (Cashier)", role: "cashier", status: "inactive" },
];
