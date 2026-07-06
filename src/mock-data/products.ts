import type { Product } from "@/types";

export const mockProducts: Product[] = [
  // Engine Oils
  { id: "p1", name: "زيت شيل هيلكس HX8 5W-30 (4 لتر)", brand: "شيل", category: "Engine Oil", barcode: "8901001", buyingPrice: 585, sellingPrice: 780, stock: 40 },
  { id: "p2", name: "زيت شيل هيلكس الترا 5W-40 (4 لتر)", brand: "شيل", category: "Engine Oil", barcode: "8901002", buyingPrice: 710, sellingPrice: 965, stock: 30 },
  { id: "p3", name: "زيت موبيل 1 ESP 5W-30 (4 لتر)", brand: "موبيل", category: "Engine Oil", barcode: "8901003", buyingPrice: 830, sellingPrice: 1195, stock: 25 },
  { id: "p4", name: "زيت موبيل سوبر 3000 5W-40", brand: "موبيل", category: "Engine Oil", barcode: "8901004", buyingPrice: 625, sellingPrice: 845, stock: 35 },
  { id: "p5", name: "زيت توتال كوارتز 9000 5W-40", brand: "توتال", category: "Engine Oil", barcode: "8901005", buyingPrice: 600, sellingPrice: 820, stock: 30 },
  { id: "p6", name: "زيت توتال كوارتز 7000 10W-40", brand: "توتال", category: "Engine Oil", barcode: "8901006", buyingPrice: 470, sellingPrice: 630, stock: 45 },
  { id: "p7", name: "زيت كاسترول ماجناتيك 5W-30", brand: "كاسترول", category: "Engine Oil", barcode: "8901007", buyingPrice: 650, sellingPrice: 885, stock: 28 },
  { id: "p8", name: "زيت كاسترول إيدج 5W-40", brand: "كاسترول", category: "Engine Oil", barcode: "8901008", buyingPrice: 790, sellingPrice: 1090, stock: 22 },
  { id: "p9", name: "زيت فالفولين ماكس لايف 10W-40", brand: "فالفولين", category: "Engine Oil", barcode: "8901009", buyingPrice: 490, sellingPrice: 670, stock: 30 },
  { id: "p10", name: "زيت ليكوي مولي توب تيك 5W-30", brand: "ليكوي مولي", category: "Engine Oil", barcode: "8901010", buyingPrice: 890, sellingPrice: 1250, stock: 18 },

  // Oil Filters
  { id: "p11", name: "فلتر زيت بوش 0451103316", brand: "بوش", category: "Oil Filter", barcode: "8902001", buyingPrice: 118, sellingPrice: 180, stock: 60 },
  { id: "p12", name: "فلتر زيت مان W712/75", brand: "مان", category: "Oil Filter", barcode: "8902002", buyingPrice: 122, sellingPrice: 195, stock: 50 },
  { id: "p13", name: "فلتر زيت ماهلي OC90", brand: "ماهلي", category: "Oil Filter", barcode: "8902003", buyingPrice: 120, sellingPrice: 185, stock: 55 },
  { id: "p14", name: "فلتر زيت تويوتا أصلي", brand: "تويوتا", category: "Oil Filter", barcode: "8902004", buyingPrice: 150, sellingPrice: 240, stock: 40 },
  { id: "p15", name: "فلتر زيت هيونداي أصلي", brand: "هيونداي", category: "Oil Filter", barcode: "8902005", buyingPrice: 130, sellingPrice: 210, stock: 45 },
  { id: "p16", name: "فلتر زيت نيسان أصلي", brand: "نيسان", category: "Oil Filter", barcode: "8902006", buyingPrice: 140, sellingPrice: 220, stock: 35 },

  // Air Filters
  { id: "p17", name: "فلتر هواء بوش S3700", brand: "بوش", category: "Air Filter", barcode: "8903001", buyingPrice: 180, sellingPrice: 280, stock: 40 },
  { id: "p18", name: "فلتر هواء مان C25114", brand: "مان", category: "Air Filter", barcode: "8903002", buyingPrice: 190, sellingPrice: 295, stock: 35 },
  { id: "p19", name: "فلتر هواء ماهلي LX3210", brand: "ماهلي", category: "Air Filter", barcode: "8903003", buyingPrice: 170, sellingPrice: 265, stock: 30 },
  { id: "p20", name: "فلتر هواء تويوتا 17801", brand: "تويوتا", category: "Air Filter", barcode: "8903004", buyingPrice: 210, sellingPrice: 330, stock: 30 },
  { id: "p21", name: "فلتر هواء K&N رياضي", brand: "K&N", category: "Air Filter", barcode: "8903005", buyingPrice: 750, sellingPrice: 1150, stock: 15 },

  // Cabin Filters
  { id: "p22", name: "فلتر تكييف بوش M2028", brand: "بوش", category: "Cabin Filter", barcode: "8904001", buyingPrice: 150, sellingPrice: 245, stock: 40 },
  { id: "p23", name: "فلتر تكييف مان CU2939", brand: "مان", category: "Cabin Filter", barcode: "8904002", buyingPrice: 180, sellingPrice: 280, stock: 30 },
  { id: "p24", name: "فلتر تكييف ماهلي LA230", brand: "ماهلي", category: "Cabin Filter", barcode: "8904003", buyingPrice: 165, sellingPrice: 255, stock: 35 },
  { id: "p25", name: "فلتر تكييف تويوتا أصلي", brand: "تويوتا", category: "Cabin Filter", barcode: "8904004", buyingPrice: 190, sellingPrice: 310, stock: 30 },
  { id: "p26", name: "فلتر تكييف كربون نشط دنسو", brand: "دنسو", category: "Cabin Filter", barcode: "8904005", buyingPrice: 270, sellingPrice: 420, stock: 25 },

  // Fuel Filters
  { id: "p27", name: "فلتر بنزين بوش F026", brand: "بوش", category: "Fuel Filter", barcode: "8905001", buyingPrice: 240, sellingPrice: 380, stock: 25 },
  { id: "p28", name: "فلتر بنزين مان WK820", brand: "مان", category: "Fuel Filter", barcode: "8905002", buyingPrice: 260, sellingPrice: 410, stock: 20 },
  { id: "p29", name: "فلتر بنزين ماهلي KL788", brand: "ماهلي", category: "Fuel Filter", barcode: "8905003", buyingPrice: 250, sellingPrice: 395, stock: 22 },
  { id: "p30", name: "فلتر بنزين تويوتا أصلي", brand: "تويوتا", category: "Fuel Filter", barcode: "8905004", buyingPrice: 320, sellingPrice: 490, stock: 20 },

  // Additives
  { id: "p31", name: "منظف دورة زيت ليكوي مولي", brand: "ليكوي مولي", category: "Additives", barcode: "8906001", buyingPrice: 150, sellingPrice: 245, stock: 40 },
  { id: "p32", name: "منظف رشاشات وينز البلجيكي", brand: "وينز", category: "Additives", barcode: "8906002", buyingPrice: 120, sellingPrice: 195, stock: 50 },
  { id: "p33", name: "إضافة معالج الزيت STP", brand: "STP", category: "Additives", barcode: "8906003", buyingPrice: 110, sellingPrice: 180, stock: 45 },
  { id: "p34", name: "إضافة وقود الديزل بارداهل", brand: "بارداهل", category: "Additives", barcode: "8906004", buyingPrice: 130, sellingPrice: 220, stock: 30 },

  // Accessories
  { id: "p35", name: "إسبراي منظف فرامل CRC 500 مل", brand: "CRC", category: "Accessories", barcode: "8907001", buyingPrice: 70, sellingPrice: 120, stock: 60 },
  { id: "p36", name: "فوطة تنظيف ميكروفايبر عالية الكثافة", brand: "عام", category: "Accessories", barcode: "8907002", buyingPrice: 90, sellingPrice: 150, stock: 50 },
  { id: "p37", name: "مياه راديتر خضراء بريستون 4 لتر", brand: "بريستون", category: "Accessories", barcode: "8907003", buyingPrice: 110, sellingPrice: 185, stock: 40 },
  { id: "p38", name: "مياه تبريد حمراء توتال 1 لتر", brand: "توتال", category: "Accessories", barcode: "8907004", buyingPrice: 130, sellingPrice: 215, stock: 35 },
  { id: "p39", name: "ملمع إطارات أرمور أول إسبراي", brand: "أرمور أول", category: "Accessories", barcode: "8907005", buyingPrice: 120, sellingPrice: 195, stock: 30 },
  { id: "p40", name: "قمع بلاستيك متين لتعبئة الزيت", brand: "عام", category: "Accessories", barcode: "8907006", buyingPrice: 150, sellingPrice: 245, stock: 20 },
  { id: "p41", name: "وردة طبة كارتيرة زيت ألومنيوم", brand: "عام", category: "Accessories", barcode: "8907007", buyingPrice: 10, sellingPrice: 25, stock: 200 },
  { id: "p42", name: "ملصق تذكير موعد تغيير الزيت (100 قطعة)", brand: "عام", category: "Accessories", barcode: "8907008", buyingPrice: 20, sellingPrice: 45, stock: 150 },
];
