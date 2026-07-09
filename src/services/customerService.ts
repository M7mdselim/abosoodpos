import { store } from "./store";
import type { Customer, CustomerCar } from "@/types";
import { backendService } from "./backendService";

function ensureCustomerCars(c: Customer): Customer {
  if (!c.cars || c.cars.length === 0) {
    c.cars = [
      {
        id: "default",
        brand: c.carBrand,
        model: c.carModel,
        currentKm: c.currentKm,
        lastServiceDate: c.lastServiceDate,
        lastOilUsed: c.lastOilUsed,
        lastOilMileage: c.lastOilMileage,
      },
    ];
  }
  return c;
}

export const customerService = {
  list: () => store.customers.map(ensureCustomerCars),
  findByPhone: (phone: string) => {
    const c = store.customers.find((c) => c.phone === phone.trim());
    return c ? ensureCustomerCars(c) : undefined;
  },
  search: (query: string) => {
    const q = query.trim().toLowerCase();
    if (!q) return store.customers.map(ensureCustomerCars);
    return store.customers
      .filter((c) => c.phone.includes(q) || c.name.toLowerCase().includes(q))
      .map(ensureCustomerCars);
  },
  get: (id: string) => {
    const c = store.customers.find((c) => c.id === id);
    return c ? ensureCustomerCars(c) : undefined;
  },
  create: (data: Omit<Customer, "id">): Customer => {
    const customer: Customer = { ...data, id: `c${Date.now()}` };
    if (!customer.cars || customer.cars.length === 0) {
      customer.cars = [
        {
          id: "default",
          brand: customer.carBrand,
          model: customer.carModel,
          currentKm: customer.currentKm,
          lastServiceDate: customer.lastServiceDate,
          lastOilUsed: customer.lastOilUsed,
          lastOilMileage: customer.lastOilMileage,
        },
      ];
    }
    store.customers = [customer, ...store.customers];
    backendService.createCustomer(customer).catch((err) => console.error("Error creating customer in backend:", err));
    return customer;
  },
  update: (id: string, patch: Partial<Customer>) => {
    let updatedCustomer: Customer | null = null;
    store.customers = store.customers.map((c) => {
      if (c.id === id) {
        const updated = { ...c, ...patch };
        // Sync default legacy car properties back for backward compatibility
        if (updated.cars && updated.cars.length > 0) {
          const mainCar = updated.cars[0];
          updated.carBrand = mainCar.brand;
          updated.carModel = mainCar.model;
          updated.currentKm = mainCar.currentKm;
          updated.lastServiceDate = mainCar.lastServiceDate;
          updated.lastOilUsed = mainCar.lastOilUsed;
          updated.lastOilMileage = mainCar.lastOilMileage;
        }
        updatedCustomer = updated;
        return updated;
      }
      return c;
    });
    if (updatedCustomer) {
      backendService.updateCustomer(id, updatedCustomer).catch((err) => console.error("Error updating customer in backend:", err));
    }
  },
  addCar: (customerId: string, car: Omit<CustomerCar, "id">): CustomerCar => {
    const newCar: CustomerCar = { ...car, id: `car_${Date.now()}` };
    const customer = customerService.get(customerId);
    if (customer) {
      const updatedCars = [...(customer.cars || []), newCar];
      customerService.update(customerId, { cars: updatedCars });
    }
    return newCar;
  },
};
