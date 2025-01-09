import type React from "react";
import fs from "fs-extra";

import { getPageName } from "../../utils/page";
import { generateClientBundle } from "../bundle/client";
import { generateLambdaBundle } from "../bundle/serverless";

export async function createServerlessFunction(
  Component: React.ElementType,
  filePath: string
) {
  const pageName = getPageName(filePath);

  const funcFolder = `.vercel/output/functions/${pageName}.func`;
  await fs.ensureDir(funcFolder);

  try {
    await Promise.allSettled([
      generateClientBundle({ filePath, pageName }),
      generateLambdaBundle({
        funcFolder,
        pageName,
        Component,
      }),
    ]);

    return fs.writeJson(`${funcFolder}/.vc-config.json`, {
      runtime: "nodejs20.x",
      handler: "index.js",
      launcherType: "Nodejs",
      shouldAddHelpers: true,
    });
  } catch (e) {
    console.error(e);
  }
}
