import pg from "pg";

const { Client } = pg;

async function test() {
  const connectionString = "postgresql://postgres.tcrnhuvkseucjzpzcnbv:POLpolPOL1!@aws-0-eu-north-1.pooler.supabase.com:6543/postgres";
  console.log("Connecting with:", connectionString);
  const client = new Client({
    connectionString,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log("Success! Connected to Supabase on port 6543 in eu-north-1.");
    const res = await client.query("SELECT NOW()");
    console.log("Query result:", res.rows[0]);
    await client.end();
  } catch (err) {
    console.error("Connection failed!");
    console.error("Error Code:", err.code);
    console.error("Error Message:", err.message);
    console.error("Full Error Object:", JSON.stringify(err, null, 2));
  }
}

test();
