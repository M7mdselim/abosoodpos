import type { User } from "@/types";

export const mockUsers: User[] = [
  { 
    id: "u1", 
    name: "Admin User", 
    username: "admin", 
    password: "admin", 
    role: "admin", 
    status: "active" 
  },
  { 
    id: "u2", 
    name: "Ahmed (Cashier)", 
    username: "cashier", 
    password: "cashier", 
    role: "cashier", 
    status: "active",
    permissions: {
      canDiscount: true,
      canOpenShift: true,
      canCloseShift: true,
      canPrintSpotCheck: true
    }
  },
  { 
    id: "u3", 
    name: "Sami (Cashier)", 
    username: "sami", 
    password: "sami", 
    role: "cashier", 
    status: "active",
    permissions: {
      canDiscount: false,
      canOpenShift: true,
      canCloseShift: false,
      canPrintSpotCheck: false
    }
  },
];
