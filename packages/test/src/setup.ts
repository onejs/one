import type { TestProject } from "vitest/node";
import type { Assertion } from "vitest";
import { spawn } from "node:child_process";
import { setupTestServers, type TestInfo } from "./setupTest";

// to keep the import which is needed for declare
const y: Assertion = 0 as any;

declare module "vitest" {
  export interface ProvidedContext {
    testInfo: TestInfo;
  }
}

let testInfo: TestInfo | null = null;

export async function setup(project: TestProject) {
  /**
   * When running tests locally, sometimes it's more convenient to run your own dev server manually instead of having the test framework managing it for you. For example, it's more easy to see the server logs, or you won't have to wait for another dev server to start if you're already running one.
   */
  const urlOfDevServerWhichIsAlreadyRunning = process.env.DEV_SERVER_URL;

  testInfo = await setupTestServers({ skipDev: !!urlOfDevServerWhichIsAlreadyRunning });

  console.info(`setting up tests`, testInfo);

  process.env.ONE_SERVER_URL =
    urlOfDevServerWhichIsAlreadyRunning ||
    `http://localhost:${testInfo.devServerPid ? testInfo.testDevPort : testInfo.testProdPort}`;

  project.provide("testInfo", testInfo);
}

// Get all child PIDs of a process using pgrep
async function getChildPids(parentPid: number): Promise<number[]> {
  try {
    const proc = spawn("pgrep", ["-P", parentPid.toString()], {
      stdio: ["ignore", "pipe", "pipe"],
    });

    return new Promise((resolve) => {
      let output = "";
      proc.stdout?.on("data", (data) => {
        output += data.toString();
      });

      proc.on("close", () => {
        const childPids = output.trim().split("\n").filter(Boolean).map(Number);
        resolve(childPids);
      });
    });
  } catch {
    return [];
  }
}

// Recursively get all descendant PIDs
async function getAllDescendantPids(parentPid: number): Promise<number[]> {
  const childPids = await getChildPids(parentPid);
  const descendantPids = [...childPids];

  for (const childPid of childPids) {
    const grandchildren = await getAllDescendantPids(childPid);
    descendantPids.push(...grandchildren);
  }

  return descendantPids;
}

// Kill a process and all its descendants
async function killProcessTree(pid: number, name: string): Promise<void> {
  try {
    const descendants = await getAllDescendantPids(pid);

    // First send SIGTERM to all descendants (reverse order - children first)
    for (const descendantPid of descendants.reverse()) {
      try {
        process.kill(descendantPid, "SIGTERM");
      } catch {
        // process may already be gone
      }
    }

    // Send SIGTERM to parent
    try {
      process.kill(pid, "SIGTERM");
    } catch {
      // process may already be gone
    }

    // Wait for graceful shutdown
    await new Promise((r) => setTimeout(r, 200));

    // Force kill any remaining processes with SIGKILL
    for (const descendantPid of descendants.reverse()) {
      try {
        process.kill(descendantPid, "SIGKILL");
      } catch {
        // process may already be gone
      }
    }

    try {
      process.kill(pid, "SIGKILL");
    } catch {
      // process may already be gone
    }

    console.info(`${name} process (PID: ${pid}) killed successfully.`);
  } catch (error) {
    console.error(`Error killing ${name} process tree for ${pid}: ${error}`);
  }
}

export const teardown = async () => {
  if (!testInfo) return;

  // Kill process trees to ensure all child processes are terminated
  const killPromises: Promise<void>[] = [];

  if (testInfo.devServerPid) {
    killPromises.push(killProcessTree(testInfo.devServerPid, "Dev server"));
  }

  if (testInfo.prodServerPid) {
    killPromises.push(killProcessTree(testInfo.prodServerPid, "Prod server"));
  }

  if (testInfo.buildPid) {
    killPromises.push(killProcessTree(testInfo.buildPid, "Build"));
  }

  await Promise.all(killPromises);
};
