import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { createServer } from "node:net";
import { setTimeout as delay } from "node:timers/promises";
import { test } from "node:test";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const nextBinary = resolve(projectRoot, "node_modules/next/dist/bin/next");

async function getAvailablePort() {
  const server = createServer();
  await new Promise((resolveListen, rejectListen) => {
    server.once("error", rejectListen);
    server.listen(0, "127.0.0.1", resolveListen);
  });
  const address = server.address();
  if (!address || typeof address === "string") {
    throw new Error("Could not allocate a local port for the route test.");
  }
  await new Promise((resolveClose, rejectClose) => {
    server.close((error) => (error ? rejectClose(error) : resolveClose()));
  });
  return address.port;
}

test(
  "Juri index redirects to a safe, category-specific verified works list",
  { timeout: 45_000 },
  async () => {
    const port = await getAvailablePort();
    const server = spawn(
      process.execPath,
      [nextBinary, "start", "--port", String(port)],
      {
        cwd: projectRoot,
        stdio: ["ignore", "pipe", "pipe"],
      },
    );
    let output = "";
    server.stdout.setEncoding("utf8").on("data", (chunk) => {
      output += chunk;
    });
    server.stderr.setEncoding("utf8").on("data", (chunk) => {
      output += chunk;
    });

    try {
      let response;
      for (let attempt = 0; attempt < 120; attempt += 1) {
        if (server.exitCode !== null) {
          throw new Error(`Next.js server exited early:\n${output}`);
        }
        try {
          response = await fetch(`http://127.0.0.1:${port}/juri`);
          break;
        } catch {
          await delay(250);
        }
      }

      assert.ok(response, `Next.js server did not start:\n${output}`);
      assert.equal(response.status, 200);
      assert.equal(new URL(response.url).pathname, "/juri/karya");

      const body = await response.text();
      assert.match(body, /Daftar Karya/);
      assert.match(body, /Cerita HAM/);
      assert.match(body, /Kandidat/);
      assert.match(body, /Juri Cerita A/);
      assert.match(body, /Juri Cerita B/);
      assert.match(body, /Belum ditinjau/);
      assert.doesNotMatch(
        body,
        /@example\.test|ktm-alief|surat-pernyataan-keaslian/i,
      );
    } finally {
      if (server.exitCode === null) {
        server.kill();
        await new Promise((resolveExit) => server.once("exit", resolveExit));
      }
    }
  },
);
