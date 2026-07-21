import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import fs from "fs";
import compression from "compression";
import { query, initDb, pool } from "./db.js";

dotenv.config(); // Reload backend configuration

const app = express();
const PORT = process.env.PORT || 5000;

app.use(compression());
app.use(cors());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));

// Initialize Database on server start
initDb().catch((err) => {
  console.error("Database initialization failed:", err);
  try {
    fs.writeFileSync("server_error.log", `DB Init Error:\n${err.stack}\n`);
  } catch (e) {
    console.error("Could not write local log file, trying /tmp:", e);
    try {
      fs.writeFileSync("/tmp/server_error.log", `DB Init Error:\n${err.stack}\n`);
    } catch (e2) {
      console.error("Could not write /tmp log file:", e2);
    }
  }
});

// Helper: map snake_case postgres row to camelCase JS object
function mapKeys(row, mapping) {
  if (!row) return null;
  const res = {};
  for (const key of Object.keys(row)) {
    const camel = mapping[key] || key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
    res[camel] = row[key];
  }
  return res;
}

// Active Server-Side Cache
const cache = {
  products: null,
  customers: null,
  sales: null,
  settings: null,
  shifts: null,
  logs: null,
};

function invalidateCache(key) {
  if (key) {
    cache[key] = null;
  } else {
    for (const k of Object.keys(cache)) {
      cache[k] = null;
    }
  }
}

// ----------------------------------------------------
// 1. AUTH ENDPOINTS
// ----------------------------------------------------
app.post("/api/auth/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    const result = await query(
      "SELECT * FROM users WHERE username = $1 AND password = $2 AND status = 'active'",
      [username, password]
    );
    if (result.rows.length === 0) {
      return res.status(401).json({ error: "اسم المستخدم أو كلمة المرور غير صحيحة" });
    }
    const user = mapKeys(result.rows[0], {});
    delete user.password; // Do not send password
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 1.5. USERS ENDPOINTS
// ----------------------------------------------------
app.get("/api/users", async (req, res) => {
  try {
    const result = await query("SELECT * FROM users ORDER BY name ASC");
    const users = result.rows.map((r) => mapKeys(r, {}));
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/users", async (req, res) => {
  const { id, username, password, name, role, status, permissions } = req.body;
  if (role === "developer") {
    return res.status(400).json({ error: "لا يمكن إنشاء حساب مطور نظام جديد" });
  }
  try {
    await query(
      `INSERT INTO users (id, username, password, name, role, status, permissions)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, username, password, name, role, status, permissions ? JSON.stringify(permissions) : null]
    );
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  const { username, password, name, role, status, permissions } = req.body;
  
  if (role === "developer") {
    try {
      const existingUserResult = await query("SELECT role FROM users WHERE id = $1", [id]);
      const existingUser = existingUserResult.rows[0];
      if (!existingUser || existingUser.role !== "developer") {
        return res.status(400).json({ error: "لا يمكن تعديل دور المستخدم إلى مطور نظام" });
      }
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  try {
    await query(
      `UPDATE users
       SET username = $1, password = $2, name = $3, role = $4, status = $5, permissions = $6
       WHERE id = $7`,
      [username, password, name, role, status, permissions ? JSON.stringify(permissions) : null, id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/users/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await query("DELETE FROM users WHERE id = $1", [id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 2. PRODUCTS ENDPOINTS
// ----------------------------------------------------
app.get("/api/products", async (req, res) => {
  try {
    if (cache.products) {
      return res.json(cache.products);
    }
    const result = await query("SELECT * FROM products ORDER BY name ASC");
    const products = result.rows.map((r) => {
      const p = mapKeys(r, {
        buying_price: "buyingPrice",
        selling_price: "sellingPrice",
        oil_mileage: "oilMileage",
        is_popular: "isPopular",
        is_unlimited: "isUnlimited",
        is_active: "isActive",
      });
      p.buyingPrice = Number(p.buyingPrice);
      p.sellingPrice = Number(p.sellingPrice);
      p.stock = Number(p.stock);
      p.isUnlimited = !!p.isUnlimited;
      p.isActive = p.isActive !== false;
      return p;
    });
    cache.products = products;
    res.json(products);
  } catch (err) {
    fs.writeFileSync("server_error.log", `Products GET Error:\n${err.stack}\n`);
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/products", async (req, res) => {
  const { id, name, brand, category, barcode, buyingPrice, sellingPrice, stock, oilMileage, isPopular, isUnlimited, isActive } = req.body;
  try {
    await query(
      `INSERT INTO products (id, name, brand, category, barcode, buying_price, selling_price, stock, oil_mileage, is_popular, is_unlimited, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [id, name, brand, category, barcode, buyingPrice, sellingPrice, stock || 0, oilMileage || null, isPopular || false, isUnlimited || false, isActive !== false]
    );
    invalidateCache("products");
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  const { name, brand, category, barcode, buyingPrice, sellingPrice, stock, oilMileage, isPopular, isUnlimited, isActive } = req.body;
  try {
    await query(
      `UPDATE products 
       SET name = $1, brand = $2, category = $3, barcode = $4, buying_price = $5, selling_price = $6, stock = $7, oil_mileage = $8, is_popular = $9, is_unlimited = $10, is_active = $11
       WHERE id = $12`,
      [name, brand, category, barcode, buyingPrice, sellingPrice, stock, oilMileage || null, isPopular || false, isUnlimited || false, isActive !== false, id]
    );
    invalidateCache("products");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/products/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await query("DELETE FROM products WHERE id = $1", [id]);
    invalidateCache("products");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 3. CUSTOMERS ENDPOINTS
// ----------------------------------------------------
app.get("/api/customers", async (req, res) => {
  try {
    if (cache.customers) {
      return res.json(cache.customers);
    }
    const custResult = await query("SELECT * FROM customers ORDER BY name ASC");
    const carsResult = await query("SELECT * FROM customer_cars");

    const carsByCustomerId = {};
    carsResult.rows.forEach((r) => {
      const car = mapKeys(r, {
        customer_id: "customerId",
        current_km: "currentKm",
        last_service_date: "lastServiceDate",
        last_oil_used: "lastOilUsed",
        last_oil_mileage: "lastOilMileage",
      });
      car.currentKm = Number(car.currentKm);
      if (!carsByCustomerId[car.customerId]) {
        carsByCustomerId[car.customerId] = [];
      }
      carsByCustomerId[car.customerId].push(car);
    });

    const customers = custResult.rows.map((r) => {
      const c = mapKeys(r, {
        car_brand: "carBrand",
        car_model: "carModel",
        current_km: "currentKm",
        last_service_date: "lastServiceDate",
        last_oil_used: "lastOilUsed",
        last_oil_mileage: "lastOilMileage",
      });
      c.currentKm = Number(c.currentKm);
      c.cars = carsByCustomerId[c.id] || [];
      return c;
    });

    cache.customers = customers;
    res.json(customers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/customers", async (req, res) => {
  const { id, name, phone, carBrand, carModel, currentKm, lastServiceDate, lastOilUsed, lastOilMileage, notes, cars } = req.body;
  try {
    // Insert customer
    await query(
      `INSERT INTO customers (id, name, phone, car_brand, car_model, current_km, last_service_date, last_oil_used, last_oil_mileage, notes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
      [id, name, phone, carBrand, carModel, currentKm || 0, lastServiceDate || null, lastOilUsed || null, lastOilMileage || null, notes || ""]
    );

    // Insert cars
    if (cars && cars.length > 0) {
      for (const car of cars) {
        await query(
          `INSERT INTO customer_cars (id, customer_id, brand, model, current_km, last_service_date, last_oil_used, last_oil_mileage)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [car.id || `car_${Date.now()}`, id, car.brand || "", car.model || "", car.currentKm || 0, car.lastServiceDate || null, car.lastOilUsed || null, car.lastOilMileage || null]
        );
      }
    }
    invalidateCache("customers");
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/customers/:id", async (req, res) => {
  const { id } = req.params;
  const { name, phone, carBrand, carModel, currentKm, lastServiceDate, lastOilUsed, lastOilMileage, notes, cars } = req.body;
  try {
    await query(
      `UPDATE customers 
       SET name = $1, phone = $2, car_brand = $3, car_model = $4, current_km = $5, last_service_date = $6, last_oil_used = $7, last_oil_mileage = $8, notes = $9
       WHERE id = $10`,
      [name, phone, carBrand, carModel, currentKm || 0, lastServiceDate || null, lastOilUsed || null, lastOilMileage || null, notes || "", id]
    );

    if (cars) {
      // Sync cars list: delete old and write new
      await query("DELETE FROM customer_cars WHERE customer_id = $1", [id]);
      for (const car of cars) {
        await query(
          `INSERT INTO customer_cars (id, customer_id, brand, model, current_km, last_service_date, last_oil_used, last_oil_mileage)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [car.id || `car_${Date.now()}`, id, car.brand || "", car.model || "", car.currentKm || 0, car.lastServiceDate || null, car.lastOilUsed || null, car.lastOilMileage || null]
        );
      }
    }

    invalidateCache("customers");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/customers/:id", async (req, res) => {
  const { id } = req.params;
  try {
    await query("DELETE FROM customer_cars WHERE customer_id = $1", [id]);
    await query("DELETE FROM customers WHERE id = $1", [id]);
    invalidateCache("customers");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 4. SHIFTS ENDPOINTS
// ----------------------------------------------------
app.get("/api/shifts", async (req, res) => {
  try {
    if (cache.shifts) {
      return res.json(cache.shifts);
    }
    const result = await query("SELECT * FROM register_shifts ORDER BY start_time DESC");
    const shifts = result.rows.map((r) => {
      const s = mapKeys(r, {
        cashier_id: "cashierId",
        cashier_name: "cashierName",
        start_time: "startTime",
        end_time: "endTime",
        opening_cash: "openingCash",
        sales_count: "salesCount",
        sales_total: "salesTotal",
        card_sales_total: "cardSalesTotal",
        cash_sales_total: "cashSalesTotal",
        expected_cash: "expectedCash",
        actual_cash: "actualCash",
        shift_day: "shiftDay",
      });
      s.openingCash = Number(s.openingCash);
      s.salesCount = Number(s.salesCount);
      s.salesTotal = Number(s.salesTotal);
      s.cardSalesTotal = Number(s.cardSalesTotal);
      s.cashSalesTotal = Number(s.cashSalesTotal);
      s.expectedCash = Number(s.expectedCash);
      if (s.actualCash !== null && s.actualCash !== undefined) s.actualCash = Number(s.actualCash);
      return s;
    });

    for (const s of shifts) {
      if (s.status === 'open') {
        const salesRes = await query(
          "SELECT total, payment_method, cash_amount, card_amount FROM sales WHERE shift_day = $1 AND status != 'voided'",
          [s.shiftDay]
        );
        let count = 0;
        let totalSum = 0;
        let cashSum = 0;
        let cardSum = 0;
        salesRes.rows.forEach((row) => {
          count++;
          const t = Number(row.total);
          totalSum += t;
          if (row.payment_method === 'Cash') {
            cashSum += row.cash_amount !== null ? Number(row.cash_amount) : t;
          } else if (row.payment_method === 'Card') {
            cardSum += row.card_amount !== null ? Number(row.card_amount) : t;
          } else if (row.payment_method === 'Mixed') {
            cashSum += Number(row.cash_amount || 0);
            cardSum += Number(row.card_amount || 0);
          }
        });
        s.salesCount = count;
        s.salesTotal = totalSum;
        s.cashSalesTotal = cashSum;
        s.cardSalesTotal = cardSum;
        s.expectedCash = s.openingCash + cashSum;
      }
    }
    cache.shifts = shifts;
    res.json(shifts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/shifts/open", async (req, res) => {
  const { id, cashierId, cashierName, startTime, openingCash, shiftDay } = req.body;
  try {
    await query(
      `INSERT INTO register_shifts (id, cashier_id, cashier_name, start_time, opening_cash, expected_cash, status, shift_day)
       VALUES ($1, $2, $3, $4, $5, $6, 'open', $7)`,
      [id, cashierId, cashierName, startTime, openingCash, openingCash, shiftDay]
    );
    invalidateCache("shifts");
    invalidateCache("logs");
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/shifts/close", async (req, res) => {
  const { actualCash, notes, endTime, shiftId } = req.body;
  try {
    let shift = null;
    if (shiftId) {
      const result = await query("SELECT * FROM register_shifts WHERE id = $1", [shiftId]);
      shift = result.rows[0];
    } else {
      const active = await query("SELECT * FROM register_shifts WHERE status = 'open'");
      shift = active.rows[0];
    }
    if (!shift) {
      return res.status(404).json({ error: "لا توجد وردية نشطة لإغلاقها" });
    }
    await query(
      `UPDATE register_shifts 
       SET status = 'closed', end_time = $1, actual_cash = $2, notes = $3 
       WHERE id = $4`,
      [endTime, actualCash, notes || "", shift.id]
    );
    invalidateCache("shifts");
    invalidateCache("logs");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/shifts/:id/day", async (req, res) => {
  const { id } = req.params;
  const { shiftDay } = req.body;
  try {
    // 1. Fetch shift
    const result = await query("SELECT * FROM register_shifts WHERE id = $1", [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "الوردية غير موجودة" });
    }
    const shift = result.rows[0];

    // 2. Update register_shifts table
    await query(
      "UPDATE register_shifts SET shift_day = $1 WHERE id = $2",
      [shiftDay, id]
    );

    // 3. Update associated sales in sales table
    await query(
      `UPDATE sales 
       SET shift_day = $1 
       WHERE cashier_id = $2 
         AND date >= $3 
         AND ($4::varchar IS NULL OR date <= $4::varchar)`,
      [shiftDay, shift.cashier_id, shift.start_time, shift.end_time || null]
    );

    invalidateCache("shifts");
    invalidateCache("sales");
    invalidateCache("logs");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 5. SALES ENDPOINTS
// ----------------------------------------------------
app.get("/api/sales", async (req, res) => {
  try {
    if (cache.sales) {
      return res.json(cache.sales);
    }
    // Limit sales syncing to the last 180 days (6 months) to control Supabase egress
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - 180);
    const cutoffStr = cutoffDate.toISOString();

    const salesResult = await query("SELECT * FROM sales WHERE date >= $1 ORDER BY date DESC", [cutoffStr]);
    const saleIds = salesResult.rows.map((r) => r.id);

    let itemsResult = { rows: [] };
    if (saleIds.length > 0) {
      itemsResult = await query("SELECT * FROM sale_items WHERE sale_id = ANY($1)", [saleIds]);
    }

    const itemsBySaleId = {};
    itemsResult.rows.forEach((r) => {
      const item = mapKeys(r, {
        sale_id: "saleId",
        product_id: "productId",
        unit_price: "unitPrice",
      });
      item.unitPrice = Number(item.unitPrice);
      item.quantity = Number(item.quantity);
      if (!itemsBySaleId[item.saleId]) {
        itemsBySaleId[item.saleId] = [];
      }
      itemsBySaleId[item.saleId].push(item);
    });

    const sales = salesResult.rows.map((r) => {
      const s = mapKeys(r, {
        invoice_number: "invoiceNumber",
        shift_day: "shiftDay",
        customer_id: "customerId",
        customer_name: "customerName",
        customer_phone: "customerPhone",
        car_brand: "carBrand",
        car_model: "carModel",
        oil_used: "oilUsed",
        oil_mileage: "oilMileage",
        cashier_id: "cashierId",
        cashier_name: "cashierName",
        payment_method: "paymentMethod",
        cash_amount: "cashAmount",
        card_amount: "cardAmount",
      });
      s.subtotal = Number(s.subtotal);
      s.discount = Number(s.discount);
      s.vat = Number(s.vat);
      s.total = Number(s.total);
      s.km = Number(s.km);
      if (s.oilMileage !== null) s.oilMileage = Number(s.oilMileage);
      if (s.cashAmount !== null) s.cashAmount = Number(s.cashAmount);
      if (s.cardAmount !== null) s.cardAmount = Number(s.cardAmount);
      s.items = itemsBySaleId[s.id] || [];
      return s;
    });

    cache.sales = sales;
    res.json(sales);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/sales", async (req, res) => {
  const {
    id,
    invoiceNumber,
    date,
    shiftDay,
    customerId,
    customerName,
    customerPhone,
    carBrand,
    carModel,
    km,
    oilUsed,
    oilMileage,
    cashierId,
    cashierName,
    items,
    subtotal,
    discount,
    vat,
    total,
    paymentMethod,
    cashAmount,
    cardAmount,
    status,
  } = req.body;

  let finalId = id;
  let finalInvoiceNumber = invoiceNumber;

  try {
    // Check if ID or invoiceNumber already exists in the database
    const existingCheck = await query(
      "SELECT id, invoice_number, total, cashier_id, customer_phone FROM sales WHERE id = $1 OR invoice_number = $2",
      [id, invoiceNumber]
    );

    if (existingCheck.rows.length > 0) {
      // Collision detected! Let's check if it's a retry of the exact same sale
      const existing = existingCheck.rows.find(row => row.id === id || row.invoice_number === invoiceNumber);
      
      // If it's the exact same sale (same customer phone, same cashier, and same total amount)
      if (
        existing.cashier_id === cashierId &&
        Number(existing.total) === Number(total) &&
        existing.customer_phone === customerPhone
      ) {
        console.log(`Identical sale found in DB (ID: ${existing.id}, Invoice: ${existing.invoice_number}). Returning success.`);
        return res.status(200).json({
          success: true,
          id: existing.id,
          invoiceNumber: existing.invoice_number
        });
      } else {
        // Different sale! This is a real collision.
        // We must generate a new unique ID and/or a new invoice number.
        console.log(`Sale collision detected (ID: ${id}, Invoice: ${invoiceNumber}). Generating new values to force save...`);
        
        if (existingCheck.rows.some(row => row.id === id)) {
          finalId = `s${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        }
        
        // Find maximum invoice number currently in DB safely by extracting all numeric values
        const allInvoices = await query("SELECT invoice_number FROM sales");
        const numericValues = [];
        for (const row of allInvoices.rows) {
          const digitsMatch = row.invoice_number.match(/\d+/);
          if (digitsMatch) {
            numericValues.push(parseInt(digitsMatch[0], 10));
          }
        }
        const maxVal = numericValues.length > 0 ? Math.max(...numericValues) : 100000;
        
        // Match the prefix from the client-provided invoice number (e.g. "INV-")
        const clientMatch = invoiceNumber.match(/^([^\d]*)/);
        const prefix = clientMatch ? clientMatch[0] : "";
        finalInvoiceNumber = `${prefix}${maxVal + 1}`;

        console.log(`Generated new ID: ${finalId}, New Invoice: ${finalInvoiceNumber}`);
      }
    }

    // 1. Save Sale
    await query(
      `INSERT INTO sales (id, invoice_number, date, shift_day, customer_id, customer_name, customer_phone, car_brand, car_model, km, oil_used, oil_mileage, cashier_id, cashier_name, subtotal, discount, vat, total, payment_method, cash_amount, card_amount, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22)`,
      [
        finalId,
        finalInvoiceNumber,
        date,
        shiftDay,
        customerId,
        customerName,
        customerPhone,
        carBrand,
        carModel,
        km,
        oilUsed || null,
        oilMileage || null,
        cashierId,
        cashierName,
        subtotal,
        discount,
        vat,
        total,
        paymentMethod,
        cashAmount || null,
        cardAmount || null,
        status || "active",
      ]
    );

    // 2. Save Sale Items & Deduct Stock
    for (const item of items) {
      await query(
        `INSERT INTO sale_items (sale_id, product_id, name, brand, unit_price, quantity)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [finalId, item.productId, item.name, item.brand, item.unitPrice, item.quantity]
      );

      // Decrement stock if not unlimited
      const prodCheck = await query("SELECT is_unlimited FROM products WHERE id = $1", [item.productId]);
      const isUnlimited = prodCheck.rows.length > 0 && prodCheck.rows[0].is_unlimited;
      if (!isUnlimited) {
        await query("UPDATE products SET stock = stock - $1 WHERE id = $2", [item.quantity, item.productId]);
      }
    }

    // 3. Update Shift stats if active
    const active = await query(
      "SELECT * FROM register_shifts WHERE status = 'open' AND cashier_id = $1",
      [cashierId]
    );
    if (active.rows.length > 0) {
      const activeShift = active.rows[0];
      const actualCash = cashAmount !== undefined && cashAmount !== null ? cashAmount : (paymentMethod === "Cash" ? total : 0);
      const actualCard = cardAmount !== undefined && cardAmount !== null ? cardAmount : (paymentMethod === "Card" ? total : 0);

      await query(
        `UPDATE register_shifts 
         SET sales_count = sales_count + 1, sales_total = sales_total + $1, cash_sales_total = cash_sales_total + $2, card_sales_total = card_sales_total + $3, expected_cash = expected_cash + $4
         WHERE id = $5`,
        [total, actualCash, actualCard, actualCash, activeShift.id]
      );
    }

    invalidateCache("sales");
    invalidateCache("products");
    invalidateCache("shifts");
    invalidateCache("logs");
    res.status(201).json({
      success: true,
      id: finalId,
      invoiceNumber: finalInvoiceNumber
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/sales/:id/void", async (req, res) => {
  const { id } = req.params;
  try {
    const saleResult = await query("SELECT * FROM sales WHERE id = $1", [id]);
    if (saleResult.rows.length === 0) {
      return res.status(404).json({ error: "الفاتورة غير موجودة" });
    }
    const sale = saleResult.rows[0];
    if (sale.status === "voided") {
      return res.status(400).json({ error: "الفاتورة ملغية بالفعل" });
    }

    // Void the sale
    await query("UPDATE sales SET status = 'voided' WHERE id = $1", [id]);

    // Restore stock
    const itemsResult = await query("SELECT * FROM sale_items WHERE sale_id = $1", [id]);
    for (const item of itemsResult.rows) {
      const prodCheck = await query("SELECT is_unlimited FROM products WHERE id = $1", [item.product_id]);
      const isUnlimited = prodCheck.rows.length > 0 && prodCheck.rows[0].is_unlimited;
      if (!isUnlimited) {
        await query("UPDATE products SET stock = stock + $1 WHERE id = $2", [item.quantity, item.product_id]);
      }
    }

    // Update active shift stats if exists
    const active = await query(
      "SELECT * FROM register_shifts WHERE status = 'open' AND cashier_id = $1",
      [sale.cashier_id]
    );
    if (active.rows.length > 0) {
      const activeShift = active.rows[0];
      const saleTotal = Number(sale.total);
      const saleCash = sale.cash_amount !== null ? Number(sale.cash_amount) : (sale.payment_method === "Cash" ? saleTotal : 0);
      const saleCard = sale.card_amount !== null ? Number(sale.card_amount) : (sale.payment_method === "Card" ? saleTotal : 0);

      await query(
        `UPDATE register_shifts 
         SET sales_count = CASE WHEN sales_count > 0 THEN sales_count - 1 ELSE 0 END,
             sales_total = CASE WHEN sales_total >= $1 THEN sales_total - $1 ELSE 0 END,
             cash_sales_total = CASE WHEN cash_sales_total >= $2 THEN cash_sales_total - $2 ELSE 0 END,
             card_sales_total = CASE WHEN card_sales_total >= $3 THEN card_sales_total - $3 ELSE 0 END,
             expected_cash = CASE WHEN expected_cash >= $4 THEN expected_cash - $4 ELSE 0 END
         WHERE id = $5`,
        [saleTotal, saleCash, saleCard, saleCash, activeShift.id]
      );
    }

    invalidateCache("sales");
    invalidateCache("products");
    invalidateCache("shifts");
    invalidateCache("logs");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.put("/api/sales/:id/payment", async (req, res) => {
  const { id } = req.params;
  const { paymentMethod, cashAmount, cardAmount } = req.body;
  try {
    const saleResult = await query("SELECT * FROM sales WHERE id = $1", [id]);
    if (saleResult.rows.length === 0) {
      return res.status(404).json({ error: "الفاتورة غير موجودة" });
    }

    const sale = saleResult.rows[0];
    const total = Number(sale.total);

    const oldCash = sale.cash_amount !== null ? Number(sale.cash_amount) : (sale.payment_method === "Cash" ? total : 0);
    const oldCard = sale.card_amount !== null ? Number(sale.card_amount) : (sale.payment_method === "Card" ? total : 0);

    const newCash = cashAmount !== undefined && cashAmount !== null ? cashAmount : (paymentMethod === "Cash" ? total : 0);
    const newCard = cardAmount !== undefined && cardAmount !== null ? cardAmount : (paymentMethod === "Card" ? total : 0);

    // Update sale
    await query(
      `UPDATE sales 
       SET payment_method = $1, cash_amount = $2, card_amount = $3
       WHERE id = $4`,
      [paymentMethod, cashAmount || null, cardAmount || null, id]
    );

    // Update active shift financial balances
    const active = await query(
      "SELECT * FROM register_shifts WHERE status = 'open' AND cashier_id = $1",
      [sale.cashier_id]
    );
    if (active.rows.length > 0) {
      const activeShift = active.rows[0];
      const cashDiff = newCash - oldCash;
      const cardDiff = newCard - oldCard;

      await query(
        `UPDATE register_shifts
         SET cash_sales_total = cash_sales_total + $1, card_sales_total = card_sales_total + $2, expected_cash = expected_cash + $3
         WHERE id = $4`,
        [cashDiff, cardDiff, cashDiff, activeShift.id]
      );
    }

    invalidateCache("sales");
    invalidateCache("shifts");
    invalidateCache("logs");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 6. USER LOGS ENDPOINTS
// ----------------------------------------------------
app.get("/api/logs", async (req, res) => {
  try {
    if (cache.logs) {
      return res.json(cache.logs);
    }
    const result = await query("SELECT * FROM user_logs ORDER BY timestamp DESC LIMIT 1000");
    const logs = result.rows.map((r) =>
      mapKeys(r, {
        user_id: "userId",
        user_name: "userName",
        user_role: "userRole",
      })
    );
    cache.logs = logs;
    res.json(logs);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/logs", async (req, res) => {
  const { id, timestamp, userId, userName, userRole, action, details } = req.body;
  try {
    await query(
      `INSERT INTO user_logs (id, timestamp, user_id, user_name, user_role, action, details)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [id, timestamp, userId, userName, userRole, action, details]
    );
    invalidateCache("logs");
    res.status(201).json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.delete("/api/logs/clear", async (req, res) => {
  try {
    await query("DELETE FROM user_logs");
    invalidateCache("logs");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 7. SETTINGS ENDPOINTS
// ----------------------------------------------------
app.get("/api/settings", async (req, res) => {
  try {
    if (cache.settings) {
      return res.json(cache.settings);
    }
    const result = await query("SELECT * FROM settings");
    const settings = {};
    result.rows.forEach((r) => {
      try {
        settings[r.key] = JSON.parse(r.value);
      } catch {
        settings[r.key] = r.value;
      }
    });
    cache.settings = settings;
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post("/api/settings", async (req, res) => {
  const settings = req.body;
  try {
    for (const key of Object.keys(settings)) {
      const val = typeof settings[key] === "object" ? JSON.stringify(settings[key]) : String(settings[key]);
      await query(
        `INSERT INTO settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, val]
      );
    }
    invalidateCache("settings");
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ----------------------------------------------------
// 8. BACKUP & RESTORE ENDPOINTS
// ----------------------------------------------------
app.get("/api/backup/export", async (req, res) => {
  try {
    const tables = [
      "users",
      "products",
      "customers",
      "customer_cars",
      "register_shifts",
      "sales",
      "sale_items",
      "user_logs",
      "settings"
    ];
    const backupData = {};
    for (const table of tables) {
      const result = await query(`SELECT * FROM ${table}`);
      backupData[table] = result.rows;
    }
    
    res.setHeader("Content-Type", "application/json");
    res.json(backupData);
  } catch (err) {
    res.status(500).json({ error: "Failed to generate backup: " + err.message });
  }
});

app.post("/api/backup/import", async (req, res) => {
  const backupData = req.body;
  if (!backupData || typeof backupData !== "object" || !backupData.users || !backupData.products) {
    return res.status(400).json({ error: "ملف النسخة الاحتياطية غير صالح" });
  }

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Delete all tables sequentially to respect foreign key constraints
    await client.query('DELETE FROM "customer_cars"');
    await client.query('DELETE FROM "sale_items"');
    await client.query('DELETE FROM "sales"');
    await client.query('DELETE FROM "register_shifts"');
    await client.query('DELETE FROM "customers"');
    await client.query('DELETE FROM "products"');
    await client.query('DELETE FROM "users"');
    await client.query('DELETE FROM "user_logs"');
    await client.query('DELETE FROM "settings"');

    // 2. Restore tables in specific order to satisfy foreign key constraints
    const restoreOrder = [
      "users",
      "settings",
      "products",
      "customers",
      "customer_cars",
      "register_shifts",
      "sales",
      "sale_items",
      "user_logs"
    ];

    for (const tableName of restoreOrder) {
      const rows = backupData[tableName];
      if (rows && rows.length > 0) {
        // Build and execute bulk insert
        const columns = Object.keys(rows[0]);
        const columnNames = columns.map(c => `"${c}"`).join(", "); // wrap in quotes to prevent reserved word issues
        
        // Chunk inserts to prevent exceeding PostgreSQL parameter limits (65,535 parameters)
        const maxParams = 30000;
        const paramsPerRow = columns.length;
        const rowsPerChunk = Math.floor(maxParams / paramsPerRow);
        
        for (let i = 0; i < rows.length; i += rowsPerChunk) {
          const chunk = rows.slice(i, i + rowsPerChunk);
          const valuePlaceholders = [];
          const values = [];
          let paramIndex = 1;

          for (const row of chunk) {
            const rowPlaceholders = [];
            for (const col of columns) {
              rowPlaceholders.push(`$${paramIndex++}`);
              let val = row[col];
              if (val !== null && typeof val === "object") {
                val = JSON.stringify(val);
              }
              values.push(val);
            }
            valuePlaceholders.push(`(${rowPlaceholders.join(", ")})`);
          }

          const queryText = `INSERT INTO "${tableName}" (${columnNames}) VALUES ${valuePlaceholders.join(", ")}`;
          await client.query(queryText, values);
        }
      }
    }

    // 3. Reset the auto-increment sequence for sale_items robustly
    try {
      const maxIdRes = await client.query('SELECT COALESCE(max(id), 0) as max_id FROM "sale_items"');
      const nextId = Number(maxIdRes.rows[0].max_id) + 1;
      await client.query(`ALTER SEQUENCE "sale_items_id_seq" RESTART WITH ${nextId}`);
    } catch (seqErr) {
      console.warn("Could not reset sequence sale_items_id_seq:", seqErr.message);
    }

    await client.query("COMMIT");
    
    // Invalidate all cache elements
    invalidateCache();
    
    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Failed to restore backup: " + err.message });
  } finally {
    client.release();
  }
});

app.post("/api/dev/reset-db", async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    // 1. Wipe all tables sequentially
    await client.query('DELETE FROM "customer_cars"');
    await client.query('DELETE FROM "sale_items"');
    await client.query('DELETE FROM "sales"');
    await client.query('DELETE FROM "register_shifts"');
    await client.query('DELETE FROM "customers"');
    await client.query('DELETE FROM "products"');
    await client.query('DELETE FROM "users"');
    await client.query('DELETE FROM "user_logs"');
    await client.query('DELETE FROM "settings"');

    // 2. Insert default users
    await client.query(`
      INSERT INTO users (id, username, password, name, role, status, permissions)
      VALUES ('u_admin_real', 'admin', 'admin123', 'أبو السعود (المدير)', 'admin', 'active', NULL)
    `);

    const cashierPerms = {
      canDiscount: true,
      canOpenShift: true,
      canCloseShift: true,
      canPrintSpotCheck: true,
      canViewReceipts: true,
      canReprintReceipts: true,
      canEditPaymentMethods: false,
      canVoidReceipts: false,
      canViewReports: false,
      canCloseAnyShift: false,
    };
    await client.query(`
      INSERT INTO users (id, username, password, name, role, status, permissions)
      VALUES ('u_cashier_real', 'cashier', '123', 'أحمد محمود (الكاشير)', 'cashier', 'active', $1)
    `, [JSON.stringify(cashierPerms)]);

    // 3. Insert default settings
    const defaultSettings = {
      companyNameAr: "شركة أبو السعود علام",
      companyNameEn: "Abu Saud Allam Oils",
      sloganAr: "لجميع أنواع الزيوت والخدمات",
      sloganEn: "For All Types of Oils & Services",
      phone: "01021111666",
      address: "المحلة الكبرى، مصر",
      shiftMode: "multiple",
      receiptWidth: "80",
      receiptMargin: "4",
      receiptFontSize: "11",
      logoUrl: "/logo.jpg",
      receiptFooter: "شكراً لزيارتكم — رافقتكم السلامة!",
      lowStockThreshold: "5",
      directPrint: "false",
      autoBackupEnabled: "false",
      autoBackupTime: "22:00",
      lastAutoBackupDate: "",
      vatEnabled: "true",
      stockAlertsEnabled: "true",
      carBrands: JSON.stringify([
        { label: "تويوتا (Toyota)", value: "Toyota" },
        { label: "هيونداي (Hyundai)", value: "Hyundai" },
        { label: "كيا (Kia)", value: "Kia" },
        { label: "نيسان (Nissan)", value: "Nissan" },
        { label: "ميتسوبيشي (Mitsubishi)", value: "Mitsubishi" },
        { label: "سوزوكي (Suzuki)", value: "Suzuki" },
        { label: "هوندا (Honda)", value: "Honda" },
        { label: "مازدا (Mazda)", value: "Mazda" },
        { label: "إيسوزو (Isuzu)", value: "Isuzu" },
        { label: "سوبارو (Subaru)", value: "Subaru" },
        { label: "لكزس (Lexus)", value: "Lexus" },
        { label: "سانج يونج / KGM (SsangYong)", value: "SsangYong" },
        { label: "جينيسيس (Genesis)", value: "Genesis" },
        { label: "ام جي (MG)", value: "MG" },
        { label: "شيري (Chery)", value: "Chery" },
        { label: "بي واي دي (BYD)", value: "BYD" },
        { label: "جيلي (Geely)", value: "Geely" },
        { label: "هافال (Haval)", value: "Haval" },
        { label: "شانجان (Changan)", value: "Changan" },
        { label: "جيتور (Jetour)", value: "Jetour" },
        { label: "بايك (BAIC)", value: "BAIC" },
        { label: "جاك (JAC)", value: "JAC" },
        { label: "دونج فنج (Dongfeng)", value: "Dongfeng" },
        { label: "سوفايست (Soueast)", value: "Soueast" },
        { label: "فورثينج (Forthing)", value: "Forthing" },
        { label: "بيستون / فاو (Bestune)", value: "Bestune" },
        { label: "كايي (Kaiyi)", value: "Kaiyi" },
        { label: "اكسيد (Exeed)", value: "Exeed" },
        { label: "ديپال (Deepal)", value: "Deepal" },
        { label: "جي اي سي (GAC Motors)", value: "GAC" },
        { label: "مرسيدس (Mercedes-Benz)", value: "Mercedes-Benz" },
        { label: "بي ام دبليو (BMW)", value: "BMW" },
        { label: "فولكس فاجن (Volkswagen)", value: "Volkswagen" },
        { label: "أوبل (Opel)", value: "Opel" },
        { label: "سكودا (Skoda)", value: "Skoda" },
        { label: "سيات (Seat)", value: "Seat" },
        { label: "فيات (Fiat)", value: "Fiat" },
        { label: "رينو (Renault)", value: "Renault" },
        { label: "بيجو (Peugeot)", value: "Peugeot" },
        { label: "ستروين (Citroën)", value: "Citroen" },
        { label: "أودي (Audi)", value: "Audi" },
        { label: "بورش (Porsche)", value: "Porsche" },
        { label: "لاند روفر (Land Rover)", value: "Land Rover" },
        { label: "جاكوار (Jaguar)", value: "Jaguar" },
        { label: "فولفو (Volvo)", value: "Volvo" },
        { label: "ألفا روميو (Alfa Romeo)", value: "Alfa Romeo" },
        { label: "كوبرا (Cupra)", value: "Cupra" },
        { label: "ميني (MINI)", value: "MINI" },
        { label: "دي اس (DS)", value: "DS" },
        { label: "شيفروليه (Chevrolet)", value: "Chevrolet" },
        { label: "جيب (Jeep)", value: "Jeep" },
        { label: "فورد (Ford)", value: "Ford" },
        { label: "كاديلاك (Cadillac)", value: "Cadillac" },
        { label: "جي ام سي (GMC)", value: "GMC" },
        { label: "تسلا (Tesla)", value: "Tesla" },
        { label: "كرايسلر (Chrysler)", value: "Chrysler" },
        { label: "دودج (Dodge)", value: "Dodge" },
        { label: "رام (RAM)", value: "RAM" },
        { label: "🏍️ دايون (Dayun)", value: "Dayun" },
        { label: "🏍️ حوا (Hawa)", value: "Hawa" },
        { label: "🏍️ حلاوة (Halawa)", value: "Halawa" },
        { label: "🏍️ بجاج / بوكسر (Bajaj / Boxer)", value: "Bajaj" },
        { label: "🏍️ تيفياس (TVS)", value: "TVS" },
        { label: "🛵 اس واي ام (SYM)", value: "SYM" },
        { label: "🛵 كيمكو (Kymco)", value: "Kymco" },
        { label: "🏍️ بنيلي (Benelli)", value: "Benelli" },
        { label: "🏍️ زونتس (Zontes)", value: "Zontes" },
        { label: "🏍️ ياماها (Yamaha)", value: "Yamaha" },
        { label: "🏍️ هوندا موتوسيكلات (Honda Motorcycle)", value: "Honda Motorcycle" },
        { label: "🏍️ كواساكي (Kawasaki)", value: "Kawasaki" },
        { label: "🏍️ سوزوكي موتوسيكلات (Suzuki Motorcycle)", value: "Suzuki Motorcycle" },
        { label: "🏍️ بي ام دبليو موتوسيكلات (BMW Motorrad)", value: "BMW Motorrad" },
        { label: "🛵 فيسبا / بياجيو (Vespa / Piaggio)", value: "Vespa" },
        { label: "🏍️ كاي واي (Keeway)", value: "Keeway" },
        { label: "🏍️ سي اف موتو (CFMoto)", value: "CFMoto" },
        { label: "🛺 توكتوك بجاج (Bajaj TukTuk)", value: "Bajaj TukTuk" },
        { label: "🛺 تروسيكل (Tricycle)", value: "Tricycle" },
      ]),
    };

    for (const key of Object.keys(defaultSettings)) {
      await client.query(
        `INSERT INTO settings (key, value) VALUES ($1, $2)`,
        [key, defaultSettings[key]]
      );
    }

    // 4. Reset the auto-increment sequence for sale_items
    try {
      await client.query('ALTER SEQUENCE "sale_items_id_seq" RESTART WITH 1');
    } catch (seqErr) {
      console.warn("Could not reset sequence sale_items_id_seq:", seqErr.message);
    }

    await client.query("COMMIT");
    invalidateCache();

    res.json({ success: true });
  } catch (err) {
    await client.query("ROLLBACK");
    res.status(500).json({ error: "Failed to reset database: " + err.message });
  } finally {
    client.release();
  }
});

// Start Server
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`Server is running in production-ready mode on port ${PORT}`);
  });
}

export default app;
