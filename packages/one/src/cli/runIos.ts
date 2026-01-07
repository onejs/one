import { loadUserOneOptions } from "../vite/loadConfig";

export async function run(args: {}) {
  const { runIos } = await import("vxrn");

  // disabling: cant set no-bundler and port?
  // const options = await loadUserOneOptions('serve')

  await runIos({
    root: process.cwd(),
    // port: options?.server?.port,
  });
}
