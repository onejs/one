import { createRoutesManifest } from "../server/createRoutesManifest";
import { globDir } from "../utils/globDir";

export function getManifest({ routerRoot }: { routerRoot: string }) {
  const routePaths = globDir(routerRoot);
  return createRoutesManifest(routePaths, {
    platform: "web",
  });
}
