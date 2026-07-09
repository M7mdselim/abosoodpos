import { store } from "./store";
import { shiftService } from "./shiftService";
import type { Sale } from "@/types";

export const saleService = {
  list: () => store.sales,
  byCustomer: (customerId: string) =>
    store.sales
      .filter((s) => s.customerId === customerId)
      .sort((a, b) => b.date.localeCompare(a.date)),
  byDate: (dateISO: string) => {
    if (!dateISO) return [];
    const day = dateISO.split("T")[0];
    return store.sales.filter((s) => {
      const matchDay = s.shiftDay || (s.date && s.date.split("T")[0]);
      return matchDay === day;
    });
  },
  byMonth: (yearMonth: string) => {
    if (!yearMonth) return [];
    return store.sales.filter((s) => {
      const matchDay = s.shiftDay || (s.date && s.date.split("T")[0]);
      return matchDay && matchDay.startsWith(yearMonth);
    });
  },
  create: (sale: Omit<Sale, "id" | "invoiceNumber" | "date" | "status">): Sale => {
    const nextNum = 100000 + store.sales.length + 1;
    const activeShift = shiftService.getActiveShift();
    const created: Sale = {
      ...sale,
      id: `s${Date.now()}`,
      invoiceNumber: `INV-${String(nextNum).padStart(6, "0")}`,
      date: new Date().toISOString(),
      shiftDay: activeShift?.shiftDay || new Date().toISOString().split("T")[0],
      status: "active",
    };
    store.sales = [created, ...store.sales];
    return created;
  },
  voidSale: (id: string): boolean => {
    const sale = store.sales.find((s) => s.id === id);
    if (!sale || sale.status === "voided") return false;

    // 1. Mark sale as voided
    store.sales = store.sales.map((s) =>
      s.id === id ? { ...s, status: "voided" as const } : s
    );

    // 2. Restore products inventory stock
    sale.items.forEach((item) => {
      const prod = store.products.find((p) => p.id === item.productId);
      if (prod) {
        store.products = store.products.map((p) =>
          p.id === item.productId ? { ...p, stock: p.stock + item.quantity } : p
        );
      }
    });

    return true;
  },
  updatePaymentMethod: (
    saleId: string,
    paymentMethod: "Cash" | "Card" | "Mixed",
    cashAmount?: number,
    cardAmount?: number
  ): boolean => {
    const saleIndex = store.sales.findIndex((s) => s.id === saleId);
    if (saleIndex === -1) return false;

    const sale = store.sales[saleIndex];
    if (sale.status === "voided") return false;

    const oldCash = sale.cashAmount !== undefined ? sale.cashAmount : (sale.paymentMethod === "Cash" ? sale.total : 0);
    const oldCard = sale.cardAmount !== undefined ? sale.cardAmount : (sale.paymentMethod === "Card" ? sale.total : 0);

    const newCash = cashAmount !== undefined ? cashAmount : (paymentMethod === "Cash" ? sale.total : 0);
    const newCard = cardAmount !== undefined ? cardAmount : (paymentMethod === "Card" ? sale.total : 0);

    const cashDiff = newCash - oldCash;
    const cardDiff = newCard - oldCard;

    // Update sale properties
    sale.paymentMethod = paymentMethod;
    sale.cashAmount = paymentMethod === "Mixed" ? newCash : undefined;
    sale.cardAmount = paymentMethod === "Mixed" ? newCard : undefined;

    store.sales = [...store.sales];

    // Update corresponding shift totals
    if (sale.shiftDay) {
      const shifts = shiftService.getShifts();
      const shiftIndex = shifts.findIndex(
        (s) => s.shiftDay === sale.shiftDay && s.cashierId === sale.cashierId
      );
      if (shiftIndex !== -1) {
        const shift = shifts[shiftIndex];
        shift.cashSalesTotal += cashDiff;
        shift.expectedCash += cashDiff;
        shift.cardSalesTotal += cardDiff;
        shiftService.saveShifts(shifts);
      }
    }

    return true;
  },
};
