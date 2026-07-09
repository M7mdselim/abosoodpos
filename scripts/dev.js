import { spawn } from "child_process";

console.log("🚀 Starting POS Backend (Express) and Frontend (Vite) concurrently...");

// 1. Start the Express Backend Server
const server = spawn("node", ["--watch", "server/index.js"], {
  stdio: "inherit",
  shell: true,
});

// 2. Start the Vite Frontend Dev Server
const client = spawn("npx", ["vite"], {
  stdio: "inherit",
  shell: true,
});

// Clean up processes on exit
const handleExit = () => {
  console.log("\nStopping processes...");
  server.kill();
  client.kill();
  process.exit();
};

process.on("SIGINT", handleExit);
process.on("SIGTERM", handleExit);
