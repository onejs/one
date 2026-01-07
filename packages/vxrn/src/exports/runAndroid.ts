import { expoRun } from "../utils/expoRun";

export const runAndroid = async ({ root, port }: { root: string; port?: number }) => {
  console.info("› one run:android");
  return await expoRun({ root, platform: "android", port });
};
