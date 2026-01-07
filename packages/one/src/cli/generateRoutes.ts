import { existsSync } from "node:fs";
import { join } from "node:path";
import { generateRouteTypes } from "../typed-routes/generateRouteTypes";
import { getRouterRootFromOneOptions } from "../utils/getRouterRootFromOneOptions";
import { loadUserOneOptions } from "../vite/loadConfig";

export async function run(args: { appDir?: string; typed?: string } = {}) {
  const cwd = process.cwd();

  // Try to load config to get One options
  let oneOptions;
  let routerRoot: string;
  let ignoredRouteFiles: string[] | undefined;

  try {
    // Suppress stderr during config load (Vite may output resolution errors)
    const originalStderrWrite = process.stderr.write;
    let stderrBuffer = "";
    process.stderr.write = ((chunk: any) => {
      stderrBuffer += chunk;
      return true;
    }) as any;

    try {
      const loaded = await loadUserOneOptions("build");
      oneOptions = loaded.oneOptions;
      routerRoot = args.appDir || getRouterRootFromOneOptions(oneOptions);
      ignoredRouteFiles = oneOptions.router?.ignoredRouteFiles;
    } finally {
      process.stderr.write = originalStderrWrite;
    }
  } catch (error) {
    // Config loading failed - use defaults
    routerRoot = args.appDir || "app";
  }

  const appDir = join(cwd, routerRoot);

  if (!existsSync(appDir)) {
    console.error(`Error: App directory not found at ${appDir}`);
    console.error(
      "You can specify a custom directory with: yarn one generate-routes --appDir=<path>",
    );
    process.exit(1);
  }

  const outFile = join(appDir, "routes.d.ts");

  // Get typed routes mode from CLI arg or config (CLI arg takes precedence)
  let typedRoutesMode: "type" | "runtime" | undefined;

  if (args.typed) {
    // CLI arg provided - validate and use it
    if (args.typed === "type" || args.typed === "runtime") {
      typedRoutesMode = args.typed;
    } else {
      console.error(`Error: Invalid --typed value "${args.typed}". Must be "type" or "runtime"`);
      process.exit(1);
    }
  } else if (oneOptions) {
    // No CLI arg - use config value if available
    typedRoutesMode = oneOptions.router?.experimental?.typedRoutesGeneration || undefined;
  }
  if (typedRoutesMode) {
  } else if (!args.typed) {
  }

  await generateRouteTypes(outFile, routerRoot, ignoredRouteFiles, typedRoutesMode);
  if (typedRoutesMode) {
  }
}
