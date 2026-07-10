import pg from "pg";

const { Client } = pg;

const regions = [
  "aws-0-eu-central-1",
  "aws-0-eu-west-1",
  "aws-0-eu-west-2",
  "aws-0-eu-west-3",
  "aws-0-eu-north-1",
  "aws-0-us-east-1",
  "aws-0-us-east-2",
  "aws-0-us-west-1",
  "aws-0-us-west-2",
  "aws-0-ap-southeast-1",
  "aws-0-ap-northeast-1",
  "aws-0-ap-northeast-2",
  "aws-0-ap-south-1",
  "aws-0-sa-east-1",
  "aws-0-ca-central-1",
  "aws-0-me-central-1",
];

async function testRegion(region) {
  const host = `${region}.pooler.supabase.com`;
  const connectionString = `postgresql://postgres.tcrnhuvkseucjzpzcnbv:POLpolPOL1!@${host}:6543/postgres`;
  
  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 5000,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log(`\n🎉 SUCCESS in region: ${region}`);
    await client.end();
    return true;
  } catch (err) {
    if (err.message.includes("tenant/user") && err.message.includes("not found")) {
      // This region is wrong
      process.stdout.write(".");
    } else {
      // This region is CORRECT, but there might be a password or auth issue!
      console.log(`\n🤔 INTERESTING in region: ${region}`);
      console.log("Error message:", err.message);
      return true;
    }
    return false;
  }
}

async function run() {
  console.log("Scanning regional poolers for project tcrnhuvkseucjzpzcnbv...");
  for (const region of regions) {
    const found = await testRegion(region);
    if (found) {
      console.log("Scan complete.");
      process.exit(0);
    }
  }
  console.log("\n❌ No active region found.");
}

run();
