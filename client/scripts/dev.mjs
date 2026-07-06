import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const clientDir = path.dirname(fileURLToPath(new URL(".", import.meta.url)));

const vite = spawn("npx", ["vite", "--host"], {
  cwd: clientDir,
  stdio: "inherit",
  shell: true,
});

vite.on("exit", (code) => {
  if (code && code !== 0) process.exit(code);
});

function shutdown() {
  vite.kill();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);