import FSExtra from "fs-extra";
import { rm } from "node:fs/promises";
import { join } from "node:path";
import type { VXRNOptions } from "../types";
import { fillOptions } from "../config/getOptionsFilled";
import { getSSRExternalsCachePath } from "../plugins/autoDepOptimizePlugin";
import { getCacheDir } from "../utils/getCacheDir";

/**
 * The main entry point for dev mode
 *
 * Note that much of the logic is being run by plugins:
 *
 *  - createFileSystemRouterPlugin does most of the fs-routes/request handling
 *  - clientTreeShakePlugin handles loaders/transforms
 *
 */

export const clean = async (rest: VXRNOptions, only?: "vite") => {
  const options = await fillOptions(rest);
  const { root } = options;

  console.info(`[vxrn] cleaning`);

  await Promise.all([
    rm(getSSRExternalsCachePath(root)).catch(throwIfNotMissingError),
    rm(join(root, "node_modules", ".vite"), {
      recursive: true,
      force: true,
    }).catch(throwIfNotMissingError),
    process.env.VXRN_DONT_CLEAN_SELF
      ? null
      : rm(getCacheDir(root), {
          recursive: true,
          force: true,
        }).catch(throwIfNotMissingError),
    only === "vite"
      ? null
      : rm(join(root, "dist"), {
          recursive: true,
          force: true,
        }).catch(throwIfNotMissingError),
  ]);
};

function throwIfNotMissingError(err: unknown) {
  if (err instanceof Error) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      throw Error;
    }
  }
}
