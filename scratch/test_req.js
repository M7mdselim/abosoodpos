async function run() {
  try {
    const res = await fetch("http://localhost:5000/api/products");
    const text = await res.text();
    console.log("STATUS:", res.status);
    console.log("RESPONSE:", text);
  } catch (err) {
    console.error("REQUEST_FAILED:", err);
  }
}
run();
