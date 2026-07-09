import dns from "dns";

const regions = [
  "aws-0-eu-central-1",
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
  "aws-0-eu-west-1",
  "aws-0-eu-west-2",
  "aws-0-eu-west-3",
  "aws-0-eu-north-1",
  "aws-0-me-central-1",
];

const projectRef = "tcrnhuvkseucjzpzcnbv";

async function check() {
  for (const region of regions) {
    const host = `${region}.pooler.supabase.com`;
    try {
      await new Promise((resolve, reject) => {
        dns.lookup(host, (err, address) => {
          if (err) reject(err);
          else resolve(address);
        });
      });
      console.log(`FOUND_REGION: ${region}`);
      process.exit(0);
    } catch (e) {
      // ignore and try next
    }
  }
  console.log("NOT_FOUND");
}

check();
