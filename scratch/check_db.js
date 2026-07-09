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
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
    `);
    console.log("TABLES_IN_DATABASE:");
    console.log(res.rows.map(r => r.table_name).join(", "));
    process.exit(0);
  } catch (err) {
    console.error("Database query error:", err);
    process.exit(1);
  }
}

check();
