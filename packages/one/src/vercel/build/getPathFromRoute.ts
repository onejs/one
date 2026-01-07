import { getPathnameFromFilePath } from "../../utils/getPathnameFromFilePath";
import type { RouteInfo } from "../../vite/types";

export function getPathFromRoute(
  route: RouteInfo<string>,
  options: { includeIndex?: boolean } = {},
) {
  return getPathnameFromFilePath(route.file, {}, false, { ...options, preserveExtensions: true })
    .replace(/^\.\//, "/")
    .replace(/\/+$/, "");
}
