/**
 * Vitest global setup for Vercel testing
 *
 * This setup:
 * 1. Builds the app with deploy: 'vercel'
 * 2. Starts the local Vercel server
 * 3. Provides ONE_SERVER_URL to tests
 * 4. Cleans up on teardown
 */

import { spawn, execSync, type ChildProcess } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";
import type { GlobalSetupContext } from "vitest/node";

const testDir = process.cwd();
const PORT = 3456;
let serverProcess: ChildProcess | null = null;

async function waitForServer(url: string, maxRetries = 60): Promise<boolean> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, { method: "HEAD" });
      if (response.ok || response.status < 500) {
        return true;
      }
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  return false;
}

function killProcessTree(pid: number) {
  try {
    if (process.platform === "win32") {
      execSync(`taskkill /pid ${pid} /T /F`, { stdio: "ignore" });
    } else {
      execSync(`kill -9 -${pid} 2>/dev/null || kill -9 ${pid}`, { stdio: "ignore" });
    }
  } catch {}
}

export async function setup({ provide }: GlobalSetupContext) {
  console.log("[test-vercel] Starting setup...");

  // Skip build if SKIP_BUILD is set (useful for debugging)
  if (!process.env.SKIP_BUILD) {
    console.log("[test-vercel] Building with Vercel deploy target...");

    try {
      execSync("yarn build:web", {
        cwd: testDir,
        stdio: "inherit",
        env: {
          ...process.env,
          ONE_SERVER_URL: `http://localhost:${PORT}`,
        },
      });
    } catch (err) {
      console.error("[test-vercel] Build failed:", err);
      throw err;
    }
  }

  // Verify build output exists
  const vercelOutputDir = join(testDir, ".vercel", "output");
  if (!existsSync(vercelOutputDir)) {
    throw new Error(`Vercel output directory not found at ${vercelOutputDir}`);
  }

  console.log("[test-vercel] Starting Vercel local server...");

  // Start the Vercel local server
  serverProcess = spawn("node", ["vercel-server.mjs"], {
    cwd: testDir,
    stdio: "inherit",
    detached: true,
    env: {
      ...process.env,
      PORT: String(PORT),
    },
  });

  serverProcess.unref();

  // Wait for server to be ready
  const serverUrl = `http://localhost:${PORT}`;
  const ready = await waitForServer(serverUrl);

  if (!ready) {
    throw new Error(`Vercel server failed to start at ${serverUrl}`);
  }

  console.log(`[test-vercel] Server ready at ${serverUrl}`);

  // Set environment variable for tests
  process.env.ONE_SERVER_URL = serverUrl;

  // Provide test info to vitest context
  provide("testInfo", {
    testDir,
    serverUrl,
  });
}

export async function teardown() {
  console.log("[test-vercel] Tearing down...");

  if (serverProcess?.pid) {
    killProcessTree(serverProcess.pid);
  }
}

declare module "vitest" {
  export interface ProvidedContext {
    testInfo: {
      testDir: string;
      serverUrl: string;
    };
  }
}
