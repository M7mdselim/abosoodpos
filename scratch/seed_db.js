import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Client } = pg;

async function seed() {
  console.log("Connecting to Database using:", process.env.DATABASE_URL ? "DATABASE_URL env var" : "No DATABASE_URL found");
  if (!process.env.DATABASE_URL) {
    console.error("Error: DATABASE_URL is not set in the environment!");
    process.exit(1);
  }

  const client = new Client({
    connectionString: process.env.DATABASE_URL,
    ssl: {
      rejectUnauthorized: false,
    },
  });

  try {
    await client.connect();
    console.log("Connected successfully to PostgreSQL database.");

    // 1. Ensure we have users
    console.log("Checking and seeding users...");
    // Let's see if admin/cashier exist
    const userCheck = await client.query("SELECT id, role FROM users");
    console.log(`Current users in DB: ${userCheck.rows.length}`);
    
    let adminUser = userCheck.rows.find(u => u.role === "admin");
    let cashierUser = userCheck.rows.find(u => u.role === "cashier");
    let devUser = userCheck.rows.find(u => u.role === "developer");

    if (!devUser) {
      console.log("Seeding developer user...");
      await client.query(`
        INSERT INTO users (id, username, password, name, role, status, permissions)
        VALUES ('u_dev_real', 'developer', 'dev123', 'مطور النظام', 'developer', 'active', NULL)
      `);
      devUser = { id: 'u_dev_real' };
    }

    if (!adminUser) {
      console.log("Seeding admin user...");
      await client.query(`
        INSERT INTO users (id, username, password, name, role, status, permissions)
        VALUES ('u_admin_real', 'admin', 'admin123', 'أبو السعود (المدير)', 'admin', 'active', NULL)
      `);
      adminUser = { id: 'u_admin_real' };
    }

    if (!cashierUser) {
      console.log("Seeding cashier user...");
      const cashierPerms = {
        canDiscount: true,
        canOpenShift: true,
        canCloseShift: true,
        canPrintSpotCheck: true,
        canViewReceipts: true,
        canReprintReceipts: true,
        canEditPaymentMethods: false,
        canVoidReceipts: false
      };
      await client.query(`
        INSERT INTO users (id, username, password, name, role, status, permissions)
        VALUES ('u_cashier_real', 'cashier', '123', 'أحمد محمود (الكاشير)', 'cashier', 'active', $1)
      `, [JSON.stringify(cashierPerms)]);
      cashierUser = { id: 'u_cashier_real' };
    }

    // Refresh cashier and admin data
    const activeUsers = await client.query("SELECT id, name FROM users");
    const adminObj = activeUsers.rows.find(u => u.id === adminUser.id || u.id === 'u_admin_real') || activeUsers.rows[0];
    const cashierObj = activeUsers.rows.find(u => u.id === cashierUser.id || u.id === 'u_cashier_real') || activeUsers.rows[0];

    // 2. Seed Products
    console.log("Seeding products...");
    // Clear existing products to ensure clean seed
    await client.query("DELETE FROM sale_items");
    await client.query("DELETE FROM sales");
    await client.query("DELETE FROM products");

    const products = [
      // Oils
      { id: "p_oil_shell_10k", name: "زيت شل هيلكس ألترا 5W-30 (10 الاف)", brand: "شل", category: "زيوت محركات", barcode: "5011987141528", buying_price: 680, selling_price: 850, stock: 45, oil_mileage: 10000, is_popular: true, is_unlimited: false },
      { id: "p_oil_shell_5k", name: "زيت شل هيلكس HX7 10W-40 (5 الاف)", brand: "شل", category: "زيوت محركات", barcode: "5011987141511", buying_price: 480, selling_price: 600, stock: 55, oil_mileage: 5000, is_popular: true, is_unlimited: false },
      { id: "p_oil_mobil_10k", name: "زيت موبيل 1 FS 5W-30 (10 الاف)", brand: "موبيل", category: "زيوت محركات", barcode: "071924151012", buying_price: 720, selling_price: 900, stock: 30, oil_mileage: 10000, is_popular: true, is_unlimited: false },
      { id: "p_oil_mobil_3k", name: "زيت موبيل سوبر 20W-50 (3 الاف)", brand: "موبيل", category: "زيوت محركات", barcode: "071924151029", buying_price: 280, selling_price: 380, stock: 65, oil_mileage: 3000, is_popular: false, is_unlimited: false },
      { id: "p_oil_castrol_10k", name: "زيت كاسترول ماجناتيك 5W-40 (10 الاف)", brand: "كاسترول", category: "زيوت محركات", barcode: "9310084013401", buying_price: 580, selling_price: 760, stock: 35, oil_mileage: 10000, is_popular: true, is_unlimited: false },
      { id: "p_oil_castrol_5k", name: "زيت كاسترول GTX 15W-40 (5 الاف)", brand: "كاسترول", category: "زيوت محركات", barcode: "9310084013425", buying_price: 360, selling_price: 470, stock: 40, oil_mileage: 5000, is_popular: false, is_unlimited: false },
      { id: "p_oil_motul_10k", name: "زيت موتول 8100 إكس-ماكس 5W-40 (10 الاف)", brand: "موتول", category: "زيوت محركات", barcode: "3374650239088", buying_price: 790, selling_price: 980, stock: 25, oil_mileage: 10000, is_popular: false, is_unlimited: false },
      
      // Oil Filters
      { id: "p_filter_toyota_org", name: "فلتر زيت تويوتا أصلي (صغير)", brand: "تويوتا", category: "فلاتر زيت", barcode: "9091510003", buying_price: 90, selling_price: 140, stock: 120, oil_mileage: null, is_popular: true, is_unlimited: false },
      { id: "p_filter_toyota_lrg", name: "فلتر زيت تويوتا أصلي (كبير)", brand: "تويوتا", category: "فلاتر زيت", barcode: "9091520003", buying_price: 100, selling_price: 160, stock: 85, oil_mileage: null, is_popular: false, is_unlimited: false },
      { id: "p_filter_hyundai_org", name: "فلتر زيت هيونداي وكيا أصلي", brand: "هيونداي", category: "فلاتر زيت", barcode: "2630035505", buying_price: 80, selling_price: 120, stock: 110, oil_mileage: null, is_popular: true, is_unlimited: false },
      { id: "p_filter_nissan_org", name: "فلتر زيت نيسان صني أصلي", brand: "نيسان", category: "فلاتر زيت", barcode: "1520831U0B", buying_price: 75, selling_price: 115, stock: 70, oil_mileage: null, is_popular: false, is_unlimited: false },
      { id: "p_filter_wix_universal", name: "فلتر زيت ويكس أمريكي عمومي", brand: "WIX", category: "فلاتر زيت", barcode: "765809151505", buying_price: 50, selling_price: 80, stock: 150, oil_mileage: null, is_popular: false, is_unlimited: false },
      
      // Air Filters
      { id: "p_filter_air_corolla", name: "فلتر هواء تويوتا كورولا (2014-2022)", brand: "تويوتا", category: "فلاتر هواء", barcode: "178010M020", buying_price: 140, selling_price: 210, stock: 40, oil_mileage: null, is_popular: false, is_unlimited: false },
      { id: "p_filter_air_elantra", name: "فلتر هواء هيونداي إلنترا AD", brand: "هيونداي", category: "فلاتر هواء", barcode: "28113F2000", buying_price: 120, selling_price: 180, stock: 35, oil_mileage: null, is_popular: false, is_unlimited: false },
      { id: "p_filter_air_sunny", name: "فلتر هواء نيسان صني N17", brand: "نيسان", category: "فلاتر هواء", barcode: "16546ED500", buying_price: 110, selling_price: 170, stock: 45, oil_mileage: null, is_popular: false, is_unlimited: false },
      
      // Cabin / AC Filters
      { id: "p_filter_ac_toyota", name: "فلتر تكييف تويوتا ياريس وكورولا", brand: "تويوتا", category: "فلاتر تكييف", barcode: "8713930040", buying_price: 110, selling_price: 180, stock: 30, oil_mileage: null, is_popular: false, is_unlimited: false },
      { id: "p_filter_ac_hyundai", name: "فلتر تكييف هيونداي إلنترا وتوسان", brand: "هيونداي", category: "فلاتر تكييف", barcode: "97133F2000", buying_price: 100, selling_price: 160, stock: 25, oil_mileage: null, is_popular: false, is_unlimited: false },
      
      // Maintenance Fluids
      { id: "p_fluid_acdelco_red", name: "مياه رادياتير إيه سي ديلكو حمراء 50/50", brand: "ACDelco", category: "سوائل صيانة", barcode: "19315053", buying_price: 220, selling_price: 320, stock: 25, oil_mileage: null, is_popular: true, is_unlimited: false },
      { id: "p_fluid_total_coolant", name: "مياه خضراء توتال للرادياتير 4 لتر", brand: "توتال", category: "سوائل صيانة", barcode: "3425901002345", buying_price: 170, selling_price: 250, stock: 30, oil_mileage: null, is_popular: false, is_unlimited: false },
      { id: "p_fluid_brake_dot4", name: "زيت باكم فرامل شل DOT 4", brand: "شل", category: "سوائل صيانة", barcode: "5011987002010", buying_price: 70, selling_price: 110, stock: 40, oil_mileage: null, is_popular: false, is_unlimited: false },
      
      // Spark Plugs & Consumables
      { id: "p_part_spark_ngk", name: "بوجيهات ليزر إيريديوم NGK (طقم 4)", brand: "NGK", category: "قطع غيار استهلاكية", barcode: "087295137680", buying_price: 380, selling_price: 520, stock: 20, oil_mileage: null, is_popular: false, is_unlimited: false },
      { id: "p_part_cleaner_wurth", name: "منظف إنجكشن Wurth ألماني", brand: "Wurth", category: "قطع غيار استهلاكية", barcode: "4045727003456", buying_price: 130, selling_price: 190, stock: 60, oil_mileage: null, is_popular: true, is_unlimited: false },
      
      // Services (Labor)
      { id: "p_srv_oil_change", name: "مصنعية تغيير زيت محرك", brand: "أبو السعود", category: "خدمات", barcode: "", buying_price: 0, selling_price: 30, stock: 0, oil_mileage: null, is_popular: true, is_unlimited: true },
      { id: "p_srv_full_flushing", name: "مصنعية غسيل المحرك بالمنظف", brand: "أبو السعود", category: "خدمات", barcode: "", buying_price: 0, selling_price: 50, stock: 0, oil_mileage: null, is_popular: true, is_unlimited: true },
      { id: "p_srv_gearbox_oil", name: "مصنعية تغيير زيت فتيس (ناقل حركة)", brand: "أبو السعود", category: "خدمات", barcode: "", buying_price: 0, selling_price: 80, stock: 0, oil_mileage: null, is_popular: false, is_unlimited: true },
    ];

    for (const p of products) {
      await client.query(`
        INSERT INTO products (id, name, brand, category, barcode, buying_price, selling_price, stock, oil_mileage, is_popular, is_unlimited, is_active)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, true)
      `, [p.id, p.name, p.brand, p.category, p.barcode, p.buying_price, p.selling_price, p.stock, p.oil_mileage, p.is_popular, p.is_unlimited]);
    }
    console.log(`Successfully seeded ${products.length} products.`);

    // 3. Seed Customers & Customer Cars
    console.log("Seeding customers and vehicles...");
    await client.query("DELETE FROM customer_cars");
    await client.query("DELETE FROM customers");

    const customers = [
      { id: "c_selim", name: "محمد سليم", phone: "01099887766", notes: "العميل يفضل زيوت شل هيلكس 10 الاف ويقوم بالجرد كل شهرين" },
      { id: "c_khalid", name: "خالد عبد الرحمن", phone: "01234567890", notes: "عميل دائم لسيارة هيونداي إلنترا" },
      { id: "c_tarek", name: "طارق العوضي", phone: "01122334455", notes: "صاحب مكتب تاكسي - يغير زيت كل أسبوعين" },
      { id: "c_yasser", name: "ياسر الديب", phone: "01555544332", notes: "صيانة دورية للسيارة رينو لوجان" },
      { id: "c_ahmed", name: "أحمد كمال أبو الخير", phone: "01005006007", notes: "" },
    ];

    for (const c of customers) {
      await client.query(`
        INSERT INTO customers (id, name, phone, notes)
        VALUES ($1, $2, $3, $4)
      `, [c.id, c.name, c.phone, c.notes]);
    }

    const cars = [
      { id: "car_selim_1", customer_id: "c_selim", brand: "تويوتا", model: "كورولا 2021", current_km: 74200, last_service_date: "2026-07-01", last_oil_used: "زيت شل هيلكس ألترا 5W-30 (10 الاف)", last_oil_mileage: 10000 },
      { id: "car_selim_2", customer_id: "c_selim", brand: "هيونداي", model: "توسان 2019", current_km: 112000, last_service_date: "2026-06-15", last_oil_used: "زيت موبيل 1 FS 5W-30 (10 الاف)", last_oil_mileage: 10000 },
      { id: "car_khalid", customer_id: "c_khalid", brand: "هيونداي", model: "إلنترا AD 2018", current_km: 98500, last_service_date: "2026-07-05", last_oil_used: "زيت شل هيلكس HX7 10W-40 (5 الاف)", last_oil_mileage: 5000 },
      { id: "car_tarek_1", customer_id: "c_tarek", brand: "تويوتا", model: "كورولا 2015", current_km: 320400, last_service_date: "2026-07-08", last_oil_used: "زيت موبيل سوبر 20W-50 (3 الاف)", last_oil_mileage: 3000 },
      { id: "car_tarek_2", customer_id: "c_tarek", brand: "نيسان", model: "صني 2019", current_km: 145000, last_service_date: "2026-07-02", last_oil_used: "زيت شل هيلكس HX7 10W-40 (5 الاف)", last_oil_mileage: 5000 },
      { id: "car_yasser", customer_id: "c_yasser", brand: "رينو", model: "لوجان 2016", current_km: 182100, last_service_date: "2026-06-20", last_oil_used: "زيت كاسترول ماجناتيك 5W-40 (10 الاف)", last_oil_mileage: 10000 },
    ];

    for (const car of cars) {
      await client.query(`
        INSERT INTO customer_cars (id, customer_id, brand, model, current_km, last_service_date, last_oil_used, last_oil_mileage)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `, [car.id, car.customer_id, car.brand, car.model, car.current_km, car.last_service_date, car.last_oil_used, car.last_oil_mileage]);
    }

    // Update main customer fields to point to their first car for backward compatibility
    for (const c of customers) {
      const firstCar = cars.find(car => car.customer_id === c.id);
      if (firstCar) {
        await client.query(`
          UPDATE customers 
          SET car_brand = $1, car_model = $2, current_km = $3, last_service_date = $4, last_oil_used = $5, last_oil_mileage = $6
          WHERE id = $7
        `, [firstCar.brand, firstCar.model, firstCar.current_km, firstCar.last_service_date, firstCar.last_oil_used, firstCar.last_oil_mileage, c.id]);
      }
    }
    console.log(`Successfully seeded ${customers.length} customers and ${cars.length} cars.`);

    // 4. Seed Shifts & Sales
    console.log("Seeding shifts and sales logs...");
    await client.query("DELETE FROM register_shifts");

    // We'll seed 3 shifts:
    // Shift 1: Completed, two days ago
    // Shift 2: Completed, yesterday
    // Shift 3: Completed, today

    const dayBeforeYesterday = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0];
    const today = new Date().toISOString().split("T")[0];

    const shifts = [
      {
        id: "shift_db_1",
        cashier_id: cashierObj.id,
        cashier_name: cashierObj.name,
        start_time: `${dayBeforeYesterday}T09:00:00.000Z`,
        end_time: `${dayBeforeYesterday}T19:00:00.000Z`,
        opening_cash: 500.00,
        sales_count: 3,
        sales_total: 1980.00,
        card_sales_total: 850.00,
        cash_sales_total: 1130.00,
        expected_cash: 1630.00,
        actual_cash: 1630.00,
        status: "closed",
        notes: "وردية الصباح الأولى - تم تسوية الحسابات تماماً ولا عجز ولا زيادة",
        shift_day: dayBeforeYesterday,
      },
      {
        id: "shift_db_2",
        cashier_id: cashierObj.id,
        cashier_name: cashierObj.name,
        start_time: `${yesterday}T09:00:00.000Z`,
        end_time: `${yesterday}T19:00:00.000Z`,
        opening_cash: 1000.00,
        sales_count: 4,
        sales_total: 3170.00,
        card_sales_total: 1610.00,
        cash_sales_total: 1560.00,
        expected_cash: 2560.00,
        actual_cash: 2550.00, // 10 EGP deficit
        status: "closed",
        notes: "عجز 10 جنيهات بسبب فكة الصندوق",
        shift_day: yesterday,
      },
      {
        id: "shift_db_3",
        cashier_id: cashierObj.id,
        cashier_name: cashierObj.name,
        start_time: `${today}T09:00:00.000Z`,
        end_time: null,
        opening_cash: 1000.00,
        sales_count: 2,
        sales_total: 1210.00,
        card_sales_total: 0.00,
        cash_sales_total: 1210.00,
        expected_cash: 2210.00,
        actual_cash: null,
        status: "open",
        notes: null,
        shift_day: today,
      }
    ];

    for (const sh of shifts) {
      await client.query(`
        INSERT INTO register_shifts (id, cashier_id, cashier_name, start_time, end_time, opening_cash, sales_count, sales_total, card_sales_total, cash_sales_total, expected_cash, actual_cash, status, notes, shift_day)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      `, [sh.id, sh.cashier_id, sh.cashier_name, sh.start_time, sh.end_time, sh.opening_cash, sh.sales_count, sh.sales_total, sh.card_sales_total, sh.cash_sales_total, sh.expected_cash, sh.actual_cash, sh.status, sh.notes, sh.shift_day]);
    }

    // Now seed sales
    const sales = [
      // Shift 1 sales (Day before yesterday)
      {
        id: "sale_s1_1",
        invoice_number: "INV-10001",
        date: `${dayBeforeYesterday}T10:15:30.000Z`,
        shift_day: dayBeforeYesterday,
        customer_id: "c_selim",
        customer_name: "محمد سليم",
        customer_phone: "01099887766",
        car_brand: "تويوتا",
        car_model: "كورولا 2021",
        km: 74200,
        oil_used: "زيت شل هيلكس ألترا 5W-30 (10 الاف)",
        oil_mileage: 10000,
        cashier_id: cashierObj.id,
        cashier_name: cashierObj.name,
        subtotal: 980.00, // 1 Shell Ultra (850) + 1 Toyota Oil Filter (130)
        discount: 30.00,
        vat: 133.00, // 14% of 950
        total: 1083.00,
        payment_method: "Cash",
        cash_amount: 1083.00,
        card_amount: 0.00,
        items: [
          { productId: "p_oil_shell_10k", name: "زيت شل هيلكس ألترا 5W-30 (10 الاف)", brand: "شل", unitPrice: 850, quantity: 1 },
          { productId: "p_filter_toyota_org", name: "فلتر زيت تويوتا أصلي (صغير)", brand: "تويوتا", unitPrice: 130, quantity: 1 }
        ]
      },
      {
        id: "sale_s1_2",
        invoice_number: "INV-10002",
        date: `${dayBeforeYesterday}T12:45:00.000Z`,
        shift_day: dayBeforeYesterday,
        customer_id: "c_khalid",
        customer_name: "خالد عبد الرحمن",
        customer_phone: "01234567890",
        car_brand: "هيونداي",
        car_model: "إلنترا AD 2018",
        km: 98500,
        oil_used: "زيت شل هيلكس HX7 10W-40 (5 الاف)",
        oil_mileage: 5000,
        cashier_id: cashierObj.id,
        cashier_name: cashierObj.name,
        subtotal: 750.00, // 1 Shell 5k (600) + 1 AC Coolant (320) + 1 Labor (30) = 950 (Wait, subtotal is unitPrices sum)
        discount: 50.00,
        vat: 98.00, // 14% of 700
        total: 798.00,
        payment_method: "Card",
        cash_amount: 0.00,
        card_amount: 798.00,
        items: [
          { productId: "p_oil_shell_5k", name: "زيت شل هيلكس HX7 10W-40 (5 الاف)", brand: "شل", unitPrice: 600, quantity: 1 },
          { productId: "p_filter_hyundai_org", name: "فلتر زيت هيونداي وكيا أصلي", brand: "هيونداي", unitPrice: 120, quantity: 1 },
          { productId: "p_srv_oil_change", name: "مصنعية تغيير زيت محرك", brand: "أبو السعود", unitPrice: 30, quantity: 1 }
        ]
      },
      {
        id: "sale_s1_3",
        invoice_number: "INV-10003",
        date: `${dayBeforeYesterday}T16:30:00.000Z`,
        shift_day: dayBeforeYesterday,
        customer_id: "walkin",
        customer_name: "عميل سفري",
        customer_phone: "بدون هاتف",
        car_brand: "بدون سيارة",
        car_model: "سفري",
        km: 0,
        oil_used: null,
        oil_mileage: null,
        cashier_id: cashierObj.id,
        cashier_name: cashierObj.name,
        subtotal: 190.00, // Wurth injector cleaner
        discount: 0.00,
        vat: 26.60,
        total: 216.60,
        payment_method: "Cash",
        cash_amount: 216.60,
        card_amount: 0.00,
        items: [
          { productId: "p_part_cleaner_wurth", name: "منظف إنجكشن Wurth ألماني", brand: "Wurth", unitPrice: 190, quantity: 1 }
        ]
      },

      // Shift 2 sales (Yesterday)
      {
        id: "sale_s2_1",
        invoice_number: "INV-10004",
        date: `${yesterday}T10:00:00.000Z`,
        shift_day: yesterday,
        customer_id: "c_tarek",
        customer_name: "طارق العوضي",
        customer_phone: "01122334455",
        car_brand: "تويوتا",
        car_model: "كورولا 2015",
        km: 320400,
        oil_used: "زيت موبيل سوبر 20W-50 (3 الاف)",
        oil_mileage: 3000,
        cashier_id: cashierObj.id,
        cashier_name: cashierObj.name,
        subtotal: 510.00, // Mobil 3k (380) + Filter (130)
        discount: 0.00,
        vat: 71.40,
        total: 581.40,
        payment_method: "Cash",
        cash_amount: 581.40,
        card_amount: 0.00,
        items: [
          { productId: "p_oil_mobil_3k", name: "زيت موبيل سوبر 20W-50 (3 الاف)", brand: "موبيل", unitPrice: 380, quantity: 1 },
          { productId: "p_filter_toyota_org", name: "فلتر زيت تويوتا أصلي (صغير)", brand: "تويوتا", unitPrice: 130, quantity: 1 }
        ]
      },
      {
        id: "sale_s2_2",
        invoice_number: "INV-10005",
        date: `${yesterday}T11:30:00.000Z`,
        shift_day: yesterday,
        customer_id: "c_yasser",
        customer_name: "ياسر الديب",
        customer_phone: "01555544332",
        car_brand: "رينو",
        car_model: "لوجان 2016",
        km: 182100,
        oil_used: "زيت كاسترول ماجناتيك 5W-40 (10 الاف)",
        oil_mileage: 10000,
        cashier_id: cashierObj.id,
        cashier_name: cashierObj.name,
        subtotal: 970.00, // Castrol 10k (760) + Filter (210)
        discount: 20.00,
        vat: 133.00,
        total: 1083.00,
        payment_method: "Card",
        cash_amount: 0.00,
        card_amount: 1083.00,
        items: [
          { productId: "p_oil_castrol_10k", name: "زيت كاسترول ماجناتيك 5W-40 (10 الاف)", brand: "كاسترول", unitPrice: 760, quantity: 1 },
          { productId: "p_filter_air_corolla", name: "فلتر هواء تويوتا كورولا (2014-2022)", brand: "تويوتا", unitPrice: 210, quantity: 1 }
        ]
      },
      {
        id: "sale_s2_3",
        invoice_number: "INV-10006",
        date: `${yesterday}T14:15:00.000Z`,
        shift_day: yesterday,
        customer_id: "c_ahmed",
        customer_name: "أحمد كمال أبو الخير",
        customer_phone: "01005006007",
        car_brand: "تويوتا",
        car_model: "كورولا 2021",
        km: 55000,
        oil_used: "زيت شل هيلكس ألترا 5W-30 (10 الاف)",
        oil_mileage: 10000,
        cashier_id: cashierObj.id,
        cashier_name: cashierObj.name,
        subtotal: 1040.00, // Shell 10k (850) + Filter (140) + Labor (50)
        discount: 40.00,
        vat: 140.00,
        total: 1140.00,
        payment_method: "Mixed",
        cash_amount: 600.00,
        card_amount: 540.00,
        items: [
          { productId: "p_oil_shell_10k", name: "زيت شل هيلكس ألترا 5W-30 (10 الاف)", brand: "شل", unitPrice: 850, quantity: 1 },
          { productId: "p_filter_toyota_org", name: "فلتر زيت تويوتا أصلي (صغير)", brand: "تويوتا", unitPrice: 140, quantity: 1 },
          { productId: "p_srv_full_flushing", name: "مصنعية غسيل المحرك بالمنظف", brand: "أبو السعود", unitPrice: 50, quantity: 1 }
        ]
      },
      {
        id: "sale_s2_4",
        invoice_number: "INV-10007",
        date: `${yesterday}T18:00:00.000Z`,
        shift_day: yesterday,
        customer_id: "walkin",
        customer_name: "عميل سفري",
        customer_phone: "بدون هاتف",
        car_brand: "بدون سيارة",
        car_model: "سفري",
        km: 0,
        oil_used: null,
        oil_mileage: null,
        cashier_id: cashierObj.id,
        cashier_name: cashierObj.name,
        subtotal: 640.00, // AC Coolant (320) * 2
        discount: 0.00,
        vat: 89.60,
        total: 729.60,
        payment_method: "Cash",
        cash_amount: 729.60,
        card_amount: 0.00,
        items: [
          { productId: "p_fluid_acdelco_red", name: "مياه رادياتير إيه سي ديلكو حمراء 50/50", brand: "ACDelco", unitPrice: 320, quantity: 2 }
        ]
      },

      // Shift 3 sales (Today)
      {
        id: "sale_s3_1",
        invoice_number: "INV-10008",
        date: `${today}T10:30:00.000Z`,
        shift_day: today,
        customer_id: "c_selim",
        customer_name: "محمد سليم",
        customer_phone: "01099887766",
        car_brand: "هيونداي",
        car_model: "توسان 2019",
        km: 112000,
        oil_used: "زيت موبيل 1 FS 5W-30 (10 الاف)",
        oil_mileage: 10000,
        cashier_id: cashierObj.id,
        cashier_name: cashierObj.name,
        subtotal: 1070.00, // Mobil 10k (900) + Filter (120) + Labor (50)
        discount: 50.00,
        vat: 142.80,
        total: 1162.80,
        payment_method: "Cash",
        cash_amount: 1162.80,
        card_amount: 0.00,
        items: [
          { productId: "p_oil_mobil_10k", name: "زيت موبيل 1 FS 5W-30 (10 الاف)", brand: "موبيل", unitPrice: 900, quantity: 1 },
          { productId: "p_filter_hyundai_org", name: "فلتر زيت هيونداي وكيا أصلي", brand: "هيونداي", unitPrice: 120, quantity: 1 },
          { productId: "p_srv_full_flushing", name: "مصنعية غسيل المحرك بالمنظف", brand: "أبو السعود", unitPrice: 50, quantity: 1 }
        ]
      },
      {
        id: "sale_s3_2",
        invoice_number: "INV-10009",
        date: `${today}T13:45:00.000Z`,
        shift_day: today,
        customer_id: "walkin",
        customer_name: "عميل سفري",
        customer_phone: "بدون هاتف",
        car_brand: "بدون سيارة",
        car_model: "سفري",
        km: 0,
        oil_used: null,
        oil_mileage: null,
        cashier_id: cashierObj.id,
        cashier_name: cashierObj.name,
        subtotal: 250.00, // Total green coolant
        discount: 0.00,
        vat: 35.00,
        total: 285.00,
        payment_method: "Cash",
        cash_amount: 285.00,
        card_amount: 0.00,
        items: [
          { productId: "p_fluid_total_coolant", name: "مياه خضراء توتال للرادياتير 4 لتر", brand: "توتال", unitPrice: 250, quantity: 1 }
        ]
      }
    ];

    // Insert sales and items
    for (const s of sales) {
      await client.query(`
        INSERT INTO sales (id, invoice_number, date, shift_day, customer_id, customer_name, customer_phone, car_brand, car_model, km, oil_used, oil_mileage, cashier_id, cashier_name, subtotal, discount, vat, total, payment_method, cash_amount, card_amount, status)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, 'active')
      `, [s.id, s.invoice_number, s.date, s.shift_day, s.customer_id, s.customer_name, s.customer_phone, s.car_brand, s.car_model, s.km, s.oil_used, s.oil_mileage, s.cashier_id, s.cashier_name, s.subtotal, s.discount, s.vat, s.total, s.payment_method, s.cash_amount, s.card_amount]);

      for (const it of s.items) {
        await client.query(`
          INSERT INTO sale_items (sale_id, product_id, name, brand, unit_price, quantity)
          VALUES ($1, $2, $3, $4, $5, $6)
        `, [s.id, it.productId, it.name, it.brand, it.unitPrice, it.quantity]);
      }
    }
    console.log(`Successfully seeded ${sales.length} sales with detailed itemization.`);

    // 5. Update shift calculations to match real seeded sales
    console.log("Updating shift aggregates to match sales perfectly...");
    for (const sh of shifts) {
      const aggResult = await client.query(`
        SELECT 
          COUNT(id) as cnt,
          SUM(total) as tot,
          SUM(CASE WHEN payment_method = 'Cash' THEN total 
                   WHEN payment_method = 'Mixed' THEN cash_amount 
                   ELSE 0 END) as cash_tot,
          SUM(CASE WHEN payment_method = 'Card' THEN total 
                   WHEN payment_method = 'Mixed' THEN card_amount 
                   ELSE 0 END) as card_tot
        FROM sales 
        WHERE cashier_id = $1 AND shift_day = $2 AND status = 'active'
      `, [sh.cashier_id, sh.shift_day]);

      const agg = aggResult.rows[0];
      const salesCount = parseInt(agg.cnt || 0);
      const salesTotal = parseFloat(agg.tot || 0);
      const cashSalesTotal = parseFloat(agg.cash_tot || 0);
      const cardSalesTotal = parseFloat(agg.card_tot || 0);
      const expectedCash = parseFloat(sh.opening_cash) + cashSalesTotal;

      await client.query(`
        UPDATE register_shifts
        SET sales_count = $1, sales_total = $2, cash_sales_total = $3, card_sales_total = $4, expected_cash = $5
        WHERE id = $6
      `, [salesCount, salesTotal, cashSalesTotal, cardSalesTotal, expectedCash, sh.id]);
    }
    
    // Explicitly update Shift 2's actual cash to maintain deficit scenario
    await client.query("UPDATE register_shifts SET actual_cash = 2550 WHERE id = 'shift_db_2'");

    console.log("Database successfully populated with clean, high-quality production-level Arabic data!");
  } catch (err) {
    console.error("Seeding failed:", err);
  } finally {
    await client.end();
    console.log("Database connection closed.");
  }
}

seed();
