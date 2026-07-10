import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

// Use Pool to manage standard database connections
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false, // Required for DB SSL connections
  },
});

export async function query(text, params) {
  return pool.query(text, params);
}

export async function initDb() {
  console.log("Initializing database tables on DB...");

  // 1. Users table
  await query(`
    CREATE TABLE IF NOT EXISTS users (
      id VARCHAR(50) PRIMARY KEY,
      username VARCHAR(50) UNIQUE NOT NULL,
      password VARCHAR(100) NOT NULL,
      name VARCHAR(100) NOT NULL,
      role VARCHAR(20) NOT NULL,
      status VARCHAR(20) NOT NULL DEFAULT 'active'
    );
  `);

  await query(`
    ALTER TABLE users ADD COLUMN IF NOT EXISTS permissions JSONB;
  `);

  // Clean up any remaining mock users from the database
  await query("DELETE FROM users WHERE id IN ('u_dev', 'u_admin', 'u_cashier')");

  // 2. Products table
  await query(`
    CREATE TABLE IF NOT EXISTS products (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(200) NOT NULL,
      brand VARCHAR(100) NOT NULL,
      category VARCHAR(100) NOT NULL,
      barcode VARCHAR(100),
      buying_price NUMERIC(10, 2) NOT NULL,
      selling_price NUMERIC(10, 2) NOT NULL,
      stock INT NOT NULL DEFAULT 0,
      oil_mileage INT,
      is_popular BOOLEAN DEFAULT false
    );
  `);

  await query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS is_unlimited BOOLEAN DEFAULT false;
  `);

  await query(`
    ALTER TABLE products ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT true;
  `);

  // 3. Customers table
  await query(`
    CREATE TABLE IF NOT EXISTS customers (
      id VARCHAR(50) PRIMARY KEY,
      name VARCHAR(150) NOT NULL,
      phone VARCHAR(50) UNIQUE NOT NULL,
      car_brand VARCHAR(100),
      car_model VARCHAR(100),
      current_km INT NOT NULL DEFAULT 0,
      last_service_date VARCHAR(50),
      last_oil_used VARCHAR(150),
      last_oil_mileage INT,
      notes TEXT
    );
  `);

  // 4. Customer cars table
  await query(`
    CREATE TABLE IF NOT EXISTS customer_cars (
      id VARCHAR(50) PRIMARY KEY,
      customer_id VARCHAR(50) REFERENCES customers(id) ON DELETE CASCADE,
      brand VARCHAR(100) NOT NULL,
      model VARCHAR(100) NOT NULL,
      current_km INT NOT NULL DEFAULT 0,
      last_service_date VARCHAR(50),
      last_oil_used VARCHAR(150),
      last_oil_mileage INT
    );
  `);

  // 5. Shifts table
  await query(`
    CREATE TABLE IF NOT EXISTS register_shifts (
      id VARCHAR(50) PRIMARY KEY,
      cashier_id VARCHAR(50) NOT NULL,
      cashier_name VARCHAR(100) NOT NULL,
      start_time VARCHAR(50) NOT NULL,
      end_time VARCHAR(50),
      opening_cash NUMERIC(10, 2) NOT NULL DEFAULT 0,
      sales_count INT NOT NULL DEFAULT 0,
      sales_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
      card_sales_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
      cash_sales_total NUMERIC(10, 2) NOT NULL DEFAULT 0,
      expected_cash NUMERIC(10, 2) NOT NULL DEFAULT 0,
      actual_cash NUMERIC(10, 2),
      status VARCHAR(20) NOT NULL DEFAULT 'open',
      notes TEXT,
      shift_day VARCHAR(20) NOT NULL
    );
  `);

  // 6. Sales table
  await query(`
    CREATE TABLE IF NOT EXISTS sales (
      id VARCHAR(50) PRIMARY KEY,
      invoice_number VARCHAR(50) UNIQUE NOT NULL,
      date VARCHAR(50) NOT NULL,
      shift_day VARCHAR(20) NOT NULL,
      customer_id VARCHAR(50) NOT NULL,
      customer_name VARCHAR(150) NOT NULL,
      customer_phone VARCHAR(50) NOT NULL,
      car_brand VARCHAR(100),
      car_model VARCHAR(100),
      km INT NOT NULL DEFAULT 0,
      oil_used VARCHAR(150),
      oil_mileage INT,
      cashier_id VARCHAR(50) NOT NULL,
      cashier_name VARCHAR(100) NOT NULL,
      subtotal NUMERIC(10, 2) NOT NULL DEFAULT 0,
      discount NUMERIC(10, 2) NOT NULL DEFAULT 0,
      vat NUMERIC(10, 2) NOT NULL DEFAULT 0,
      total NUMERIC(10, 2) NOT NULL DEFAULT 0,
      payment_method VARCHAR(20) NOT NULL,
      cash_amount NUMERIC(10, 2),
      card_amount NUMERIC(10, 2),
      status VARCHAR(20) NOT NULL DEFAULT 'active'
    );
  `);

  // 7. Sale items table
  await query(`
    CREATE TABLE IF NOT EXISTS sale_items (
      id SERIAL PRIMARY KEY,
      sale_id VARCHAR(50) REFERENCES sales(id) ON DELETE CASCADE,
      product_id VARCHAR(50) NOT NULL,
      name VARCHAR(200) NOT NULL,
      brand VARCHAR(100) NOT NULL,
      unit_price NUMERIC(10, 2) NOT NULL,
      quantity INT NOT NULL DEFAULT 1
    );
  `);

  // 8. User logs table
  await query(`
    CREATE TABLE IF NOT EXISTS user_logs (
      id VARCHAR(50) PRIMARY KEY,
      timestamp VARCHAR(50) NOT NULL,
      user_id VARCHAR(50) NOT NULL,
      user_name VARCHAR(100) NOT NULL,
      user_role VARCHAR(20) NOT NULL,
      action VARCHAR(100) NOT NULL,
      details TEXT NOT NULL
    );
  `);

  // 9. Settings table
  await query(`
    CREATE TABLE IF NOT EXISTS settings (
      key VARCHAR(50) PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  console.log("Database initialized successfully!");
}
