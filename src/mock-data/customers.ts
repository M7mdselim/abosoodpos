import type { Customer } from "@/types";

const firstNames = ["Ahmed", "Mohammed", "Ali", "Omar", "Yousef", "Khaled", "Hassan", "Fahad", "Saeed", "Nasser", "Salem", "Majed", "Turki", "Bandar", "Faisal", "Sultan", "Waleed", "Ibrahim", "Abdullah", "Rashed", "Sami", "Tariq", "Marwan", "Ziad", "Rami"];
const lastNames = ["Al-Harbi", "Al-Otaibi", "Al-Qahtani", "Al-Ghamdi", "Al-Zahrani", "Al-Shehri", "Al-Malki", "Al-Dosari", "Al-Amri", "Al-Sulami", "Al-Anzi", "Al-Rashidi", "Al-Mutairi", "Al-Shammari", "Al-Juhani"];
const carBrands = [
  { brand: "Toyota", models: ["Camry", "Corolla", "Hilux", "Land Cruiser", "Yaris", "RAV4"] },
  { brand: "Hyundai", models: ["Elantra", "Sonata", "Tucson", "Accent", "Santa Fe"] },
  { brand: "Nissan", models: ["Altima", "Sunny", "Patrol", "X-Trail", "Sentra"] },
  { brand: "Kia", models: ["Cerato", "Sportage", "Sorento", "Rio", "Optima"] },
  { brand: "Honda", models: ["Accord", "Civic", "CR-V", "Pilot"] },
  { brand: "Ford", models: ["Explorer", "Edge", "F-150", "Escape"] },
  { brand: "Chevrolet", models: ["Tahoe", "Suburban", "Malibu", "Silverado"] },
  { brand: "Mazda", models: ["CX-5", "Mazda3", "Mazda6", "CX-9"] },
  { brand: "Lexus", models: ["ES 350", "LX 570", "RX 350", "GX 460"] },
  { brand: "GMC", models: ["Yukon", "Sierra", "Terrain"] },
];
const oils = ["Shell HX8 5W-30", "Shell Helix Ultra 5W-40", "Mobil 1 ESP 5W-30", "Castrol Magnatec 5W-30", "Total Quartz 9000 5W-40", "Mobil Super 3000 5W-40"];

function pick<T>(arr: T[], i: number): T {
  return arr[i % arr.length];
}

function pad(n: number, len: number) {
  return String(n).padStart(len, "0");
}

export const mockCustomers: Customer[] = Array.from({ length: 50 }, (_, i) => {
  const first = pick(firstNames, i * 3 + 1);
  const last = pick(lastNames, i * 7 + 2);
  const cb = pick(carBrands, i);
  const model = pick(cb.models, i * 2);
  const km = 15000 + (i * 3547) % 180000;
  const daysAgo = 5 + (i * 11) % 240;
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return {
    id: `c${i + 1}`,
    name: `${first} ${last}`,
    phone: `05${pad(10000000 + i * 123457, 8).slice(0, 8)}`,
    carBrand: cb.brand,
    carModel: model,
    currentKm: km,
    lastServiceDate: date.toISOString().split("T")[0],
    lastOilUsed: pick(oils, i),
  };
});
