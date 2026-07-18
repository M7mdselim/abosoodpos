import { store } from "./store";
import { shiftService } from "./shiftService";
import { authService } from "./authService";
import { userLogService } from "./userLogService";
import { backendService } from "./backendService";
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
    
    // Get local YYYY-MM-DD string instead of UTC toISOString
    const getLocalDayStr = () => {
      const d = new Date();
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    };

    const shiftDay = activeShift?.shiftDay || getLocalDayStr();
    
    // Construct local Date using the shiftDay date and the current clock time
    const getShiftDateTimeISO = (day: string) => {
      const now = new Date();
      const timePart = now.toTimeString().split(" ")[0]; // "HH:MM:SS"
      const ms = String(now.getMilliseconds()).padStart(3, '0');
      const localDate = new Date(`${day}T${timePart}.${ms}`);
      return isNaN(localDate.getTime()) ? now.toISOString() : localDate.toISOString();
    };

    const created: Sale = {
      ...sale,
      id: `s${Date.now()}`,
      invoiceNumber: `${nextNum}`,
      date: getShiftDateTimeISO(shiftDay),
      shiftDay: shiftDay,
      status: "active",
    };
    store.sales = [created, ...store.sales];

    // Decrement product stock in local store immediately if not unlimited
    created.items.forEach((item) => {
      store.products = store.products.map((p) =>
        p.id === item.productId && !p.isUnlimited
          ? { ...p, stock: Math.max(0, p.stock - item.quantity) }
          : p
      );
    });

    backendService.createSale(created).catch((err) => console.error("Error saving sale to backend:", err));
    
    // Log Action
    const session = authService.getSession();
    if (session) {
      userLogService.log(
        session.id,
        session.name,
        session.role,
        "إنشاء فاتورة",
        `تم إنشاء فاتورة رقم ${created.invoiceNumber} بقيمة ${created.total} ج.م (${created.paymentMethod === "Cash" ? "نقدي" : created.paymentMethod === "Card" ? "كارت" : "مختلط"}).`
      );
    }

    return created;
  },
  voidSale: (id: string): boolean => {
    const sale = store.sales.find((s) => s.id === id);
    if (!sale || sale.status === "voided") return false;

    // 1. Mark sale as voided
    store.sales = store.sales.map((s) =>
      s.id === id ? { ...s, status: "voided" as const } : s
    );
    backendService.voidSale(id).catch((err) => console.error("Error voiding sale in backend:", err));

    // 2. Restore products inventory stock in local store if not unlimited
    sale.items.forEach((item) => {
      store.products = store.products.map((p) =>
        p.id === item.productId && !p.isUnlimited ? { ...p, stock: p.stock + item.quantity } : p
      );
    });

    // 3. Reverse shift totals for the voided sale
    const shifts = shiftService.getShifts();
    const shiftIndex = shifts.findIndex(
      (s) => s.shiftDay === sale.shiftDay && s.cashierId === sale.cashierId
    );
    if (shiftIndex !== -1) {
      const shift = shifts[shiftIndex];
      const saleCash = sale.cashAmount !== undefined ? sale.cashAmount : (sale.paymentMethod === "Cash" ? sale.total : 0);
      const saleCard = sale.cardAmount !== undefined ? sale.cardAmount : (sale.paymentMethod === "Card" ? sale.total : 0);
      shift.salesCount = Math.max(0, shift.salesCount - 1);
      shift.salesTotal = Math.max(0, shift.salesTotal - sale.total);
      shift.cashSalesTotal = Math.max(0, shift.cashSalesTotal - saleCash);
      shift.cardSalesTotal = Math.max(0, shift.cardSalesTotal - saleCard);
      shift.expectedCash = Math.max(0, shift.expectedCash - saleCash);
      shiftService.saveShifts(shifts);
    }

    // Log Action
    const session = authService.getSession();
    if (session) {
      userLogService.log(
        session.id,
        session.name,
        session.role,
        "إلغاء فاتورة",
        `تم إلغاء الفاتورة رقم ${sale.invoiceNumber} بقيمة ${sale.total} ج.م.`
      );
    }

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

    const oldMethod = sale.paymentMethod;

    // Update sale properties
    sale.paymentMethod = paymentMethod;
    sale.cashAmount = paymentMethod === "Mixed" ? newCash : undefined;
    sale.cardAmount = paymentMethod === "Mixed" ? newCard : undefined;

    store.sales = [...store.sales];
    backendService.updatePaymentMethod(saleId, paymentMethod, newCash, newCard)
      .catch((err) => console.error("Error updating payment in backend:", err));

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

    // Log Action
    const session = authService.getSession();
    if (session) {
      const methodStr = paymentMethod === "Cash" ? "نقدي" : paymentMethod === "Card" ? "كارت" : "مختلط";
      const oldStr = oldMethod === "Cash" ? "نقدي" : oldMethod === "Card" ? "كارت" : "مختلط";
      userLogService.log(
        session.id,
        session.name,
        session.role,
        "تعديل طريقة الدفع",
        `تم تعديل طريقة دفع الفاتورة رقم ${sale.invoiceNumber} من ${oldStr} إلى ${methodStr}.`
      );
    }

    return true;
  },
};
