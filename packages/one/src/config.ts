import { isWebServer } from "./constants";
import type { One } from "./vite/types";

// works client or server
export const getDefaultRenderMode = () => {
  const CLIENT_RENDER_MODE = process.env.ONE_DEFAULT_RENDER_MODE as One.RouteRenderMode | undefined;
  const serverConfig = globalThis["__vxrnPluginConfig__"] as One.PluginOptions | undefined;

  if (!CLIENT_RENDER_MODE && isWebServer && !serverConfig) {
    if (process.env.IS_VXRN_CLI) {
      throw new Error(`Internal one error: should call setServerConfig before createManifest`);
    }
  }

  return CLIENT_RENDER_MODE ?? serverConfig?.web?.defaultRenderMode ?? "ssg";
};
