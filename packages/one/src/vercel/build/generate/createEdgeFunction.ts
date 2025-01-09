import type React from "react";
import { ensureDir, writeJson } from "fs-extra";

import { generateEdgeBundle } from "../bundle/edge";
import { generateClientBundle } from "../bundle/client";
import { getPageName } from "../../utils/page";

export async function createEdgeFunction(
  Component: React.ElementType,
  filePath: string
) {
  const pageName = getPageName(filePath);
  const funcFolder = `.vercel/output/functions/${pageName}.func`;

  await ensureDir(funcFolder);

  try {
    await generateEdgeBundle({
      funcFolder,
      filePath,
      pageName,
      Component,
    });

    return writeJson(`${funcFolder}/.vc-config.json`, {
      runtime: "edge",
      entrypoint: "index.js",
    });
  } catch (e) {
    console.error(e);
  }
}
