import type React from "react";
import fs from "fs-extra";
import { writeJson } from "fs-extra";

import type { PrerenderPageConfig } from "../../types";
import { createServerlessFunction } from "./createServerlessFunction";
import { createStaticFile } from "./createStaticFile";
import { getPageName } from "../../utils/page";

export async function createPrerender(
  Component: React.ElementType,
  filePath: string,
  pageConfig: PrerenderPageConfig
) {
  const pageName = getPageName(filePath);

  const funcFolder = `.vercel/output/functions/${pageName}.func`;
  await fs.ensureDir(funcFolder);

  try {
    await Promise.allSettled([
      createServerlessFunction(Component, filePath),
      createStaticFile(Component, filePath, {
        outdir: `.vercel/output/functions`,
        fileName: `${pageName}.prerender-fallback.html`,
        bundle: false,
      }),
    ]);

    return writeJson(
      `.vercel/output/functions/${pageName}.prerender-config.json`,
      {
        expiration: pageConfig.revalidate,
        group: 1,
        fallback: `${pageName}.prerender-fallback.html`,
      }
    );
  } catch (e) {
    console.error('createPrerender', e);
  }
}
