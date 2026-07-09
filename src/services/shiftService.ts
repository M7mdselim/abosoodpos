import { store } from "./store";
import { authService } from "./authService";
import { userLogService } from "./userLogService";
import { backendService } from "./backendService";

export interface Shift {
  id: string;
  cashierId: string;
  cashierName: string;
  startTime: string;
  endTime?: string;
  openingCash: number;
  closingCash?: number;
  salesCount: number;
  salesTotal: number;
  cardSalesTotal: number;
  cashSalesTotal: number;
  expectedCash: number;
  actualCash?: number;
  status: "open" | "closed";
  notes?: string;
  shiftDay: string; // The operational business date (e.g. "2026-07-01")
}

const STORAGE_KEY_SHIFTS = "app_shifts";

function addDays(dateStr: string, days: number): string {
  // Use noon time to prevent local timezone offsets from shifting dates
  const date = new Date(dateStr + "T12:00:00");
  date.setDate(date.getDate() + days);
  return date.toISOString().split("T")[0];
}

export const shiftService = {
  getShifts(): Shift[] {
    if (typeof window === "undefined") return [];
    const stored = localStorage.getItem(STORAGE_KEY_SHIFTS);
    if (!stored) return [];
    try {
      const parsed = JSON.parse(stored) as Shift[];
      // Backwards compatibility for legacy shifts that didn't have shiftDay
      return parsed.map((s) => ({
        ...s,
        shiftDay: s.shiftDay || s.startTime.split("T")[0],
      }));
    } catch {
      return [];
    }
  },

  saveShifts(shifts: Shift[]): void {
    localStorage.setItem(STORAGE_KEY_SHIFTS, JSON.stringify(shifts));
  },

  getActiveShift(): Shift | null {
    const shifts = this.getShifts();
    return shifts.find((s) => s.status === "open") || null;
  },

  getNextProposedShiftDay(startNewDay?: boolean): string {
    const shifts = this.getShifts();
    const lastShift = shifts[0] || null;
    const settings = store.settings;
    if (!lastShift) {
      return new Date().toISOString().split("T")[0];
    }
    const lastShiftDay = lastShift.shiftDay || lastShift.startTime.split("T")[0];
    if (settings.shiftMode === "single") {
      return addDays(lastShiftDay, 1);
    } else {
      return startNewDay ? addDays(lastShiftDay, 1) : lastShiftDay;
    }
  },

  openShift(cashierId: string, cashierName: string, openingCash: number, startNewDay?: boolean): Shift {
    const active = this.getActiveShift();
    if (active) return active;

    const shifts = this.getShifts();
    const lastShift = shifts[0] || null;
    const settings = store.settings;

    let shiftDay = "";
    if (!lastShift) {
      shiftDay = new Date().toISOString().split("T")[0];
    } else {
      const lastShiftDay = lastShift.shiftDay || lastShift.startTime.split("T")[0];
      if (settings.shiftMode === "single") {
        shiftDay = addDays(lastShiftDay, 1);
      } else {
        shiftDay = startNewDay ? addDays(lastShiftDay, 1) : lastShiftDay;
      }
    }

    const newShift: Shift = {
      id: "sh_" + Date.now(),
      cashierId,
      cashierName,
      startTime: new Date().toISOString(),
      openingCash,
      salesCount: 0,
      salesTotal: 0,
      cardSalesTotal: 0,
      cashSalesTotal: 0,
      expectedCash: openingCash,
      status: "open",
      shiftDay,
    };

    shifts.unshift(newShift);
    this.saveShifts(shifts);
    backendService.openShift(newShift).catch((err) => console.error("Error opening shift in backend:", err));

    // Log Action
    const session = authService.getSession();
    if (session) {
      userLogService.log(
        session.id,
        session.name,
        session.role,
        "فتح الوردية",
        `تم فتح وردية جديدة باسم ${session.name} بمبلغ افتتاح ${openingCash} ج.م (يوم الوردية: ${newShift.shiftDay}).`
      );
    }

    return newShift;
  },

  closeShift(actualCash: number, notes?: string): Shift | null {
    const shifts = this.getShifts();
    const activeIndex = shifts.findIndex((s) => s.status === "open");
    if (activeIndex === -1) return null;

    const active = shifts[activeIndex];
    active.status = "closed";
    active.endTime = new Date().toISOString();
    active.actualCash = actualCash;
    active.notes = notes;

    this.saveShifts(shifts);
    backendService.closeShift(actualCash, notes || "", active.endTime)
      .catch((err) => console.error("Error closing shift in backend:", err));

    // Log Action
    const session = authService.getSession();
    if (session) {
      userLogService.log(
        session.id,
        session.name,
        session.role,
        "إغلاق الوردية",
        `تم إغلاق الوردية النشطة باسم ${active.cashierName} بمبلغ جرد فعلي ${actualCash} ج.م (المتوقع: ${active.expectedCash} ج.م، الفارق: ${actualCash - active.expectedCash} ج.م).`
      );
    }

    return active;
  },

  recordSale(saleAmount: number, paymentMethod: "Cash" | "Card" | "Mixed", cashAmount?: number, cardAmount?: number): void {
    const shifts = this.getShifts();
    const activeIndex = shifts.findIndex((s) => s.status === "open");
    if (activeIndex === -1) return;

    const active = shifts[activeIndex];
    active.salesCount += 1;
    active.salesTotal += saleAmount;

    const actualCash = cashAmount !== undefined ? cashAmount : (paymentMethod === "Cash" ? saleAmount : 0);
    const actualCard = cardAmount !== undefined ? cardAmount : (paymentMethod === "Card" ? saleAmount : 0);

    active.cashSalesTotal += actualCash;
    active.expectedCash += actualCash;
    active.cardSalesTotal += actualCard;

    this.saveShifts(shifts);
  },
};
