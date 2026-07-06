import type { Product } from "@/types";

export const mockProducts: Product[] = [
  // Engine Oils
  { id: "p1", name: "Shell HX8 5W-30", brand: "Shell", category: "Engine Oil", barcode: "8901001", buyingPrice: 85, sellingPrice: 130, stock: 40 },
  { id: "p2", name: "Shell Helix Ultra 5W-40", brand: "Shell", category: "Engine Oil", barcode: "8901002", buyingPrice: 110, sellingPrice: 165, stock: 30 },
  { id: "p3", name: "Mobil 1 ESP 5W-30", brand: "Mobil", category: "Engine Oil", barcode: "8901003", buyingPrice: 130, sellingPrice: 195, stock: 25 },
  { id: "p4", name: "Mobil Super 3000 5W-40", brand: "Mobil", category: "Engine Oil", barcode: "8901004", buyingPrice: 95, sellingPrice: 145, stock: 35 },
  { id: "p5", name: "Total Quartz 9000 5W-40", brand: "Total", category: "Engine Oil", barcode: "8901005", buyingPrice: 90, sellingPrice: 140, stock: 30 },
  { id: "p6", name: "Total Quartz 7000 10W-40", brand: "Total", category: "Engine Oil", barcode: "8901006", buyingPrice: 70, sellingPrice: 110, stock: 45 },
  { id: "p7", name: "Castrol Magnatec 5W-30", brand: "Castrol", category: "Engine Oil", barcode: "8901007", buyingPrice: 100, sellingPrice: 155, stock: 28 },
  { id: "p8", name: "Castrol Edge 5W-40", brand: "Castrol", category: "Engine Oil", barcode: "8901008", buyingPrice: 125, sellingPrice: 190, stock: 22 },
  { id: "p9", name: "Valvoline MaxLife 10W-40", brand: "Valvoline", category: "Engine Oil", barcode: "8901009", buyingPrice: 75, sellingPrice: 120, stock: 30 },
  { id: "p10", name: "Liqui Moly Top Tec 5W-30", brand: "Liqui Moly", category: "Engine Oil", barcode: "8901010", buyingPrice: 140, sellingPrice: 210, stock: 18 },

  // Oil Filters
  { id: "p11", name: "Bosch Oil Filter 0451103316", brand: "Bosch", category: "Oil Filter", barcode: "8902001", buyingPrice: 18, sellingPrice: 30, stock: 60 },
  { id: "p12", name: "Mann W712/75 Oil Filter", brand: "Mann", category: "Oil Filter", barcode: "8902002", buyingPrice: 22, sellingPrice: 35, stock: 50 },
  { id: "p13", name: "Mahle OC90 Oil Filter", brand: "Mahle", category: "Oil Filter", barcode: "8902003", buyingPrice: 20, sellingPrice: 32, stock: 55 },
  { id: "p14", name: "Toyota Genuine Oil Filter", brand: "Toyota", category: "Oil Filter", barcode: "8902004", buyingPrice: 25, sellingPrice: 40, stock: 40 },
  { id: "p15", name: "Hyundai Oil Filter 26300-35505", brand: "Hyundai", category: "Oil Filter", barcode: "8902005", buyingPrice: 23, sellingPrice: 36, stock: 45 },
  { id: "p16", name: "Nissan Oil Filter 15208-65F00", brand: "Nissan", category: "Oil Filter", barcode: "8902006", buyingPrice: 24, sellingPrice: 38, stock: 35 },

  // Air Filters
  { id: "p17", name: "Bosch Air Filter S3700", brand: "Bosch", category: "Air Filter", barcode: "8903001", buyingPrice: 30, sellingPrice: 50, stock: 40 },
  { id: "p18", name: "Mann C25114 Air Filter", brand: "Mann", category: "Air Filter", barcode: "8903002", buyingPrice: 32, sellingPrice: 52, stock: 35 },
  { id: "p19", name: "Mahle LX3210 Air Filter", brand: "Mahle", category: "Air Filter", barcode: "8903003", buyingPrice: 28, sellingPrice: 48, stock: 30 },
  { id: "p20", name: "Toyota Air Filter 17801-0T060", brand: "Toyota", category: "Air Filter", barcode: "8903004", buyingPrice: 35, sellingPrice: 55, stock: 30 },
  { id: "p21", name: "K&N Performance Air Filter", brand: "K&N", category: "Air Filter", barcode: "8903005", buyingPrice: 120, sellingPrice: 190, stock: 15 },

  // Cabin Filters
  { id: "p22", name: "Bosch Cabin Filter M2028", brand: "Bosch", category: "Cabin Filter", barcode: "8904001", buyingPrice: 25, sellingPrice: 45, stock: 40 },
  { id: "p23", name: "Mann CU2939 Cabin Filter", brand: "Mann", category: "Cabin Filter", barcode: "8904002", buyingPrice: 30, sellingPrice: 50, stock: 30 },
  { id: "p24", name: "Mahle LA230 Cabin Filter", brand: "Mahle", category: "Cabin Filter", barcode: "8904003", buyingPrice: 28, sellingPrice: 48, stock: 35 },
  { id: "p25", name: "Toyota Cabin Filter 87139-YZZ08", brand: "Toyota", category: "Cabin Filter", barcode: "8904004", buyingPrice: 32, sellingPrice: 55, stock: 30 },
  { id: "p26", name: "Carbon Activated Cabin Filter", brand: "Denso", category: "Cabin Filter", barcode: "8904005", buyingPrice: 45, sellingPrice: 75, stock: 25 },

  // Fuel Filters
  { id: "p27", name: "Bosch Fuel Filter F026402085", brand: "Bosch", category: "Fuel Filter", barcode: "8905001", buyingPrice: 40, sellingPrice: 65, stock: 25 },
  { id: "p28", name: "Mann WK820/1 Fuel Filter", brand: "Mann", category: "Fuel Filter", barcode: "8905002", buyingPrice: 45, sellingPrice: 70, stock: 20 },
  { id: "p29", name: "Mahle KL788 Fuel Filter", brand: "Mahle", category: "Fuel Filter", barcode: "8905003", buyingPrice: 42, sellingPrice: 68, stock: 22 },
  { id: "p30", name: "Toyota Fuel Filter 23300-31100", brand: "Toyota", category: "Fuel Filter", barcode: "8905004", buyingPrice: 55, sellingPrice: 85, stock: 20 },

  // Additives
  { id: "p31", name: "Liqui Moly Engine Flush", brand: "Liqui Moly", category: "Additives", barcode: "8906001", buyingPrice: 25, sellingPrice: 45, stock: 40 },
  { id: "p32", name: "Wynn's Injector Cleaner", brand: "Wynn's", category: "Additives", barcode: "8906002", buyingPrice: 20, sellingPrice: 35, stock: 50 },
  { id: "p33", name: "STP Oil Treatment", brand: "STP", category: "Additives", barcode: "8906003", buyingPrice: 18, sellingPrice: 30, stock: 45 },
  { id: "p34", name: "Bardahl Diesel Additive", brand: "Bardahl", category: "Additives", barcode: "8906004", buyingPrice: 22, sellingPrice: 38, stock: 30 },

  // Accessories
  { id: "p35", name: "Brake Cleaner Spray 500ml", brand: "CRC", category: "Accessories", barcode: "8907001", buyingPrice: 12, sellingPrice: 22, stock: 60 },
  { id: "p36", name: "Microfiber Cloth Pack", brand: "Generic", category: "Accessories", barcode: "8907002", buyingPrice: 15, sellingPrice: 28, stock: 50 },
  { id: "p37", name: "Windshield Washer Fluid 4L", brand: "Prestone", category: "Accessories", barcode: "8907003", buyingPrice: 18, sellingPrice: 32, stock: 40 },
  { id: "p38", name: "Coolant G12 1L", brand: "Total", category: "Accessories", barcode: "8907004", buyingPrice: 22, sellingPrice: 38, stock: 35 },
  { id: "p39", name: "Tire Shine Spray", brand: "Armor All", category: "Accessories", barcode: "8907005", buyingPrice: 20, sellingPrice: 35, stock: 30 },
  { id: "p40", name: "Funnel & Drain Pan Set", brand: "Generic", category: "Accessories", barcode: "8907006", buyingPrice: 25, sellingPrice: 45, stock: 20 },
  { id: "p41", name: "Oil Drain Plug Washer", brand: "Generic", category: "Accessories", barcode: "8907007", buyingPrice: 2, sellingPrice: 5, stock: 200 },
  { id: "p42", name: "Service Sticker Pack", brand: "Generic", category: "Accessories", barcode: "8907008", buyingPrice: 3, sellingPrice: 8, stock: 150 },
];
