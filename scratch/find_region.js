import dns from "dns";

const projectRef = "tcrnhuvkseucjzpzcnbv";
const resolver = new dns.Resolver();
resolver.setServers(["8.8.8.8"]); // Use Google DNS

async function run() {
  const host = `db.${projectRef}.supabase.co`;
  console.log(`Resolving AAAA (IPv6) for: ${host} using Google DNS...`);
  
  try {
    const addresses = await new Promise((resolve, reject) => {
      resolver.resolve6(host, (err, ret) => {
        if (err) reject(err);
        else resolve(ret);
      });
    });
    
    console.log("IPv6 Addresses found:", addresses);
    
    for (const ip of addresses) {
      try {
        const hostnames = await new Promise((resolve, reject) => {
          resolver.reverse(ip, (err, domains) => {
            if (err) reject(err);
            else resolve(domains);
          });
        });
        console.log(`Reverse lookup for ${ip}:`, hostnames);
      } catch (e) {
        console.log(`Reverse lookup failed for ${ip}: ${e.message}`);
      }
    }
  } catch (e) {
    console.log(`Resolution failed: ${e.message}`);
  }
}

run();
