// In-memory mock store. Replace these services with API calls later.
import { mockCustomers } from "@/mock-data/customers";
import { mockProducts } from "@/mock-data/products";
import { mockSales } from "@/mock-data/sales";
import { mockUsers } from "@/mock-data/users";
import type { Customer, Product, Sale, User } from "@/types";

export const store = {
  customers: [...mockCustomers] as Customer[],
  products: [...mockProducts] as Product[],
  sales: [...mockSales] as Sale[],
  users: [...mockUsers] as User[],
};
