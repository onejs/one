import ansis from "ansis";
import FSExtra from "fs-extra";
import { join } from "node:path";
import { execPromise } from "@vxrn/utils";
import type { ExtraSteps } from "./types";

export const extraSteps: ExtraSteps = async ({ isFullClone, projectName, packageManager }) => {
  const useBun = packageManager === "bun";

  const runCommand = (scriptName: string) =>
    `${packageManager} ${useBun ? "" : "run "}${scriptName}`;

  if (isFullClone) {
    console.info(
      `\n${ansis.green.bold("Done!")} Created a new project under ./${ansis.greenBright(projectName)}`,
    );
  }

  console.info(`\nTo run: 

  ${ansis.green("cd")} ${projectName}
  ${ansis.green(runCommand("dev"))}\n`);
};

export const preInstall: ExtraSteps = async ({ projectName, packageManager, projectPath }) => {
  const path = projectPath || projectName;
  const envExample = join(path, ".env.example");

  if (FSExtra.existsSync(envExample)) {
    await FSExtra.move(envExample, join(path, ".env"));
    console.info(`Moved .env.example to .env`);
  }

  if (packageManager === "pnpm") {
    await FSExtra.writeFile(join(path, `.npmrc`), `node-linker=hoisted\n`);
    console.info(`Set up .npmrc to avoid symlinked node_modules

Note! 👋

If you are working in a monorepo, you need to move the .npmrc with the node-linker
configuration to the root of the monorepo rather than here.

`);
  }

  if (packageManager === "yarn") {
    await FSExtra.writeFile(
      join(path, ".yarnrc.yml"),
      `
compressionLevel: mixed
enableGlobalCache: false
enableTelemetry: false
nodeLinker: node-modules

logFilters:
  - code: YN0002
    level: discard
  - code: YN0060
    level: discard
  - code: YN0006
    level: discard
  - code: YN0076
    level: discard
`,
    );
    await execPromise(`yarn set version stable`);
    await FSExtra.writeFile(join(path, "yarn.lock"), "");
    console.info(`Set up yarn for latest version`);
  }
};
