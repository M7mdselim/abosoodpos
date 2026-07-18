import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function check() {
  try {
    const res = await pool.query(`
      SELECT invoice_number 
      FROM sales 
      LIMIT 20
    `);
    console.log("INVOICE_NUMBERS:");
    console.log(res.rows.map(r => r.invoice_number));
    process.exit(0);
  } catch (err) {
    console.error("Database query error:", err);
    process.exit(1);
  }
}

check();
