import type fs from "node:fs";
import FSExtra from "fs-extra";
import path from "node:path";
import { createHash } from "node:crypto";

export function tryStatSync(file: string): fs.Stats | undefined {
  try {
    // The "throwIfNoEntry" is a performance optimization for cases where the file does not exist
    return FSExtra.statSync(file, { throwIfNoEntry: false });
  } catch {}
}

export async function lookupFile(dir: string, fileNames: string[]): Promise<string | undefined> {
  while (dir) {
    for (const fileName of fileNames) {
      const fullPath = path.join(dir, fileName);
      if (tryStatSync(fullPath)?.isFile()) return fullPath;
    }
    const parentDir = path.dirname(dir);
    if (parentDir === dir) return;

    dir = parentDir;
  }
}

export function getHash(text: Buffer | string, length = 8): string {
  const h = createHash("sha256")
    .update(text as any)
    .digest("hex")
    .substring(0, length);
  if (length <= 64) return h;
  return h.padEnd(length, "_");
}

export async function getFileHash(path: string) {
  const content = await FSExtra.readFile(path, "utf-8");
  return getHash(content);
}
