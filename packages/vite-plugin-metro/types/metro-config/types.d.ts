import type { ConfigT } from "metro-config";
export type MetroConfig = ConfigT;
export type ExtraConfig = {
  getResolveMainModuleName?: (p: { platform: "ios" | "android" }) => string;
};
export type MetroConfigExtended = MetroConfig & ExtraConfig;
//# sourceMappingURL=types.d.ts.map
