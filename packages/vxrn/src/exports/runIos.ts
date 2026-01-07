import { expoRun } from "../utils/expoRun";

export const runIos = async ({ root, port }: { root: string; port?: number }) => {
  console.info("› one run:ios");
  return await expoRun({ root, platform: "ios", port });
};
