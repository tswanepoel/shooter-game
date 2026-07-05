import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const PORT = 17373;
const ENDPOINT = "/__debug/snapshot";
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const debugDir = path.join(repoRoot, "debug");

function writeSnapshot(body) {
  fs.mkdirSync(debugDir, { recursive: true });
  fs.writeFileSync(path.join(debugDir, "latest.json"), body);

  try {
    const parsed = JSON.parse(body);
    if (typeof parsed.formatted === "string") {
      fs.writeFileSync(path.join(debugDir, "latest.txt"), parsed.formatted);
    }

    const recordPath = path.join(debugDir, "record.jsonl");
    if (parsed.session?.phase === "start" && parsed.session.seq === 0) {
      fs.writeFileSync(recordPath, `${body}\n`);
    } else {
      fs.appendFileSync(recordPath, `${body}\n`);
    }
  } catch {
    // keep json only
  }
}

const server = http.createServer((req, res) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method !== "POST" || req.url !== ENDPOINT) {
    res.writeHead(404);
    res.end();
    return;
  }

  const chunks = [];
  req.on("data", (chunk) => chunks.push(chunk));
  req.on("end", () => {
    writeSnapshot(Buffer.concat(chunks).toString("utf8"));
    res.writeHead(204);
    res.end();
  });
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`[debug-relay] writing to ${debugDir}`);
  console.log(`[debug-relay] listening on http://127.0.0.1:${PORT}${ENDPOINT}`);
});