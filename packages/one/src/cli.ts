import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineCommand, runMain, showUsage } from "citty";
import colors from "picocolors";

function getPackageVersion() {
  let dirname;
  if (typeof __dirname !== "undefined") {
    // CommonJS
    dirname = __dirname;
  } else {
    // ESM
    dirname = path.dirname(fileURLToPath(import.meta.url));
  }
  const packagePath = path.join(dirname, "..", "..", "package.json");
  const packageJson = JSON.parse(readFileSync(packagePath, "utf-8"));
  return packageJson.version;
}

const version = getPackageVersion();

const DOCS_BASE = "https://onestack.dev/docs";

const docsLinks = {
  dev: `${DOCS_BASE}/one-dev`,
  build: `${DOCS_BASE}/one-build`,
  serve: `${DOCS_BASE}/one-serve`,
  prebuild: `${DOCS_BASE}/guides-ios-native`,
  "run:ios": `${DOCS_BASE}/guides-ios-native`,
  "run:android": `${DOCS_BASE}/guides-ios-native`,
  clean: `${DOCS_BASE}/configuration`,
  patch: `${DOCS_BASE}/configuration`,
  "generate-routes": `${DOCS_BASE}/routing-typed-routes`,
} as const;

function withDocsLink(description: string, command: keyof typeof docsLinks): string {
  return `${description}\n\nDocs: ${docsLinks[command]}`;
}

if (path.sep !== "/") {
  console.warn(
    colors.bgYellow("WARNING: UNSUPPORTED OS") +
      colors.yellow(
        " - It appears you’re using Windows, which is currently not supported. You may experience unexpected issues.",
      ),
  );
}

const modes = {
  development: "development",
  production: "production",
} as const;

const dev = defineCommand({
  meta: {
    name: "dev",
    version: version,
    description: withDocsLink("Start the dev server", "dev"),
  },
  args: {
    clean: {
      type: "boolean",
    },
    host: {
      type: "string",
    },
    port: {
      type: "string",
    },
    https: {
      type: "boolean",
    },
    mode: {
      type: "string",
      description:
        'If set to "production" you can run the development server but serve the production bundle',
    },
    "debug-bundle": {
      type: "string",
      description: `Will output the bundle to a temp file and then serve it from there afterwards allowing you to easily edit the bundle to debug problems.`,
    },
    debug: {
      type: "string",
      description: `Pass debug args to Vite`,
    },
  },
  async run({ args }) {
    const { dev } = await import("./cli/dev");
    await dev({
      ...args,
      debugBundle: args["debug-bundle"],
      mode: modes[args.mode],
    });
  },
});

const buildCommand = defineCommand({
  meta: {
    name: "build",
    version: version,
    description: withDocsLink("Build your app", "build"),
  },
  args: {
    step: {
      type: "string",
      required: false,
    },
    // limit the pages built
    only: {
      type: "string",
      required: false,
    },
    platform: {
      type: "string",
      description: `One of: web, ios, android`,
      default: "web",
      required: false,
    },
  },
  async run({ args }) {
    const { build } = await import("./cli/build");

    const platforms = {
      ios: "ios",
      web: "web",
      android: "android",
    } as const;

    if (args.platform && !platforms[args.platform]) {
      throw new Error(`Invalid platform: ${args.platform}`);
    }

    const platform = platforms[args.platform as keyof typeof platforms] || "web";

    await build({
      only: args.only,
      platform,
      step: args.step,
    });
    // TODO somewhere just before 1787f241b79 this stopped exiting, must have some hanging task
    process.exit(0);
  },
});

const serveCommand = defineCommand({
  meta: {
    name: "serve",
    version: version,
    description: withDocsLink("Serve a built app for production", "serve"),
  },
  args: {
    host: {
      type: "string",
    },
    port: {
      type: "string",
    },
    compress: {
      type: "boolean",
    },
    loadEnv: {
      type: "boolean",
    },
  },
  async run({ args }) {
    const { serve } = await import("./serve");
    await serve({
      port: args.port ? +args.port : undefined,
      host: args.host,
      compress: args.compress,
      loadEnv: !!args.loadEnv,
    });
  },
});

const prebuild = defineCommand({
  meta: {
    name: "prebuild",
    version: version,
    description: withDocsLink("Prebuild native project", "prebuild"),
  },
  args: {
    platform: {
      type: "string",
      description: "ios or android",
    },

    expo: {
      type: "boolean",
      description: "expo or non-expo folders",
      default: true,
    },

    "no-install": {
      type: "boolean",
      description: "skip installing native dependencies",
      default: false,
    },
  },
  async run({ args }) {
    if (args.install === false) args["no-install"] = true; // citty seems to convert --no-install to install: false, leaving no-install as default

    const { run } = await import("./cli/prebuild");
    await run(args);
  },
});

const runIos = defineCommand({
  meta: {
    name: "run:ios",
    version: version,
    description: withDocsLink("Run the iOS app", "run:ios"),
  },
  args: {},
  async run({ args }) {
    const { run } = await import("./cli/runIos");
    await run(args);
  },
});

const runAndroid = defineCommand({
  meta: {
    name: "run:android",
    version: version,
    description: withDocsLink("Run the Android app", "run:android"),
  },
  args: {},
  async run({ args }) {
    const { run } = await import("./cli/runAndroid");
    await run(args);
  },
});

const clean = defineCommand({
  meta: {
    name: "clean",
    version: "0.0.0",
    description: withDocsLink("Clean build folders", "clean"),
  },
  args: {},
  async run() {
    const { clean: vxrnClean } = await import("vxrn");
    await vxrnClean({
      root: process.cwd(),
    });
  },
});

const patch = defineCommand({
  meta: {
    name: "patch",
    version: "0.0.0",
    description: withDocsLink("Apply package patches", "patch"),
  },
  args: {},
  async run({ args }) {
    const { run } = await import("./cli/patch");
    await run(args);
  },
});

const generateRoutes = defineCommand({
  meta: {
    name: "generate-routes",
    version: version,
    description: withDocsLink("Generate route type definitions", "generate-routes"),
  },
  args: {
    appDir: {
      type: "string",
      description: 'Path to app directory (default: "app")',
    },
    typed: {
      type: "string",
      description:
        'Auto-generate route helpers. Options: "type" (type-only helpers) or "runtime" (runtime helpers)',
    },
  },
  async run({ args }) {
    const { run } = await import("./cli/generateRoutes");
    await run(args);
  },
});

const subCommands = {
  dev,
  clean,
  build: buildCommand,
  prebuild,
  "run:ios": runIos,
  "run:android": runAndroid,
  patch,
  serve: serveCommand,
  "generate-routes": generateRoutes,
};

// workaround for having sub-commands but also positional arg for naming in the create flow
const subMain = defineCommand({
  meta: {
    name: "main",
    version: version,
    description: "Welcome to One",
  },
  subCommands,
});

const main = defineCommand({
  meta: {
    name: "main",
    version: version,
    description: "Welcome to One",
  },
  args: {
    name: {
      type: "positional",
      description: "Folder name to place the app into",
      required: false,
    },
  },
  async run({ args }) {
    if (subCommands[args.name]) {
      // run sub command ourselves
      runMain(subMain);
      return;
    }

    const { cliMain } = await import("./cli/main");
    await cliMain(args);
  },
});

// workaround for help with our workaround for sub-command + positional arg

const helpIndex = process.argv.indexOf("--help");
if (helpIndex > 0) {
  const subCommandName = process.argv[helpIndex - 1];
  const subCommand = subCommands[subCommandName];
  if (subCommand) {
    showUsage(subCommand);
  }
} else {
  runMain(main);
}
