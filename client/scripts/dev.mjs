import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const clientDir = path.dirname(fileURLToPath(new URL(".", import.meta.url)));

function run(command, args) {
  const child = spawn(command, args, {
    cwd: clientDir,
    stdio: "inherit",
    shell: true,
  });
  child.on("exit", (code) => {
    if (code && code !== 0) process.exit(code);
  });
  return child;
}

const relay = run("node", ["scripts/debug-relay.mjs"]);
const vite = run("npx", ["vite", "--host"]);

function shutdown() {
  relay.kill();
  vite.kill();
  process.exit(0);
}

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);