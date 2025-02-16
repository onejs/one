export const serverlessVercelConfig = {
  runtime: "nodejs20.x",
  handler: "entrypoint/index.js",
  launcherType: "Nodejs",
  shouldAddHelpers: true,
  shouldAddSourceMapSupport: true,
}