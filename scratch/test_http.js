async function test() {
  const url = "https://tcrnhuvkseucjzpzcnbv.supabase.co";
  console.log("Fetching url:", url);
  try {
    const res = await fetch(url);
    console.log("Status:", res.status);
    console.log("Headers:", [...res.headers.entries()]);
    const text = await res.text();
    console.log("Response text:", text);
  } catch (err) {
    console.error("Fetch failed:", err);
  }
}

test();
