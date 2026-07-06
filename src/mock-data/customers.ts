import type { Customer } from "@/types";

const firstNames = ["أحمد", "محمد", "علي", "عمر", "يوسف", "خالد", "حسن", "عمرو", "مصطفى", "إبراهيم", "تامر", "شريف", "أيمن", "سامح", "كريم", "هاني", "وائل", "محمود", "عادل", "رائد", "هشام", "حاتم", "ممدوح", "ياسر", "رامي"];
const lastNames = ["المنشاوي", "الشناوي", "عبد الفتاح", "الشربيني", "الفيومي", "عبد العزيز", "الجارحي", "التهامي", "سليمان", "شعلان", "غنيم", "عتمان", "الباز", "حجازي", "بكري"];
const carBrands = [
  { brand: "تويوتا", models: ["كورولا", "ياريس", "كامري", "راف فور", "هيلوكس"] },
  { brand: "هيونداي", models: ["إلنترا", "فيرنا", "توسان", "أكسنت", "سانتا في"] },
  { brand: "نيسان", models: ["صني", "سنترا", "قشقاي", "تيدا", "جوك"] },
  { brand: "كيا", models: ["سيراتو", "سبورتاج", "ريو", "سول", "بيكانتو"] },
  { brand: "شيفروليه", models: ["أوبترا", "أفيو", "لانوس", "كابتيفا", "دبابة"] },
  { brand: "ميتسوبيشي", models: ["لانسر شارك", "أتراج", "إكليبس", "باجيرو"] },
  { brand: "رينو", models: ["لوجان", "ميغان", "داستر", "كادجار"] },
  { brand: "فيات", models: ["تيبو", "500", "بونتو"] },
  { brand: "سوزوكي", models: ["سويفت", "ديزاير", "ارتيجا", "ماروتي"] },
  { brand: "سكودا", models: ["أوكتافيا", "سوبرب", "كودياك"] },
];
const oils = [
  "زيت شيل هيلكس HX8 5W-30",
  "زيت شيل هيلكس الترا 5W-40",
  "زيت موبيل 1 ESP 5W-30",
  "زيت كاسترول ماجناتيك 5W-30",
  "زيت توتال كوارتز 9000 5W-40",
  "زيت موبيل سوبر 3000 5W-40"
];

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
  
  // Egyptian operator prefixes: 010, 011, 012, 015
  const operator = pick(["10", "11", "12", "15"], i);
  const phoneSuffix = pad(1000000 + i * 98765, 8).slice(0, 8);

  return {
    id: `c${i + 1}`,
    name: `${first} ${last}`,
    phone: `0${operator}${phoneSuffix}`,
    carBrand: cb.brand,
    carModel: model,
    currentKm: km,
    lastServiceDate: date.toISOString().split("T")[0],
    lastOilUsed: pick(oils, i),
  };
});
