import type { VXRNOptionsFilled } from "./config/getOptionsFilled";
import { getReactNativeBundle } from "./utils/getReactNativeBundle";
type WorkerCommands = {
  name: "bundle-react-native";
  arg: {
    options: Pick<VXRNOptionsFilled, "root"> &
      Partial<Pick<VXRNOptionsFilled, "cacheDir">> &
      Parameters<typeof getReactNativeBundle>[0];
    platform: "ios" | "android";
  };
  returns: string;
};
export declare function runOnWorker<Command extends WorkerCommands>(
  name: Command["name"],
  arg: Command["arg"],
): Promise<Command["returns"]>;
export {};
//# sourceMappingURL=worker.d.ts.map
