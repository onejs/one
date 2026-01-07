/** Match `[page]` -> `page` or `[...page]` -> `page` with deep flag */
const dynamicNameRe = /^\[([^[\]]+?)\]$/;

export interface DynamicNameMatch {
  name: string;
  deep: boolean;
}

/** Match `[page]` -> `{ name: 'page', deep: false }` or `[...page]` -> `{ name: 'page', deep: true }` */
export function matchDynamicName(name: string): DynamicNameMatch | undefined {
  const paramName = name.match(dynamicNameRe)?.[1];
  if (paramName == null) {
    return undefined;
  } else if (paramName.startsWith("...")) {
    return { name: paramName.slice(3), deep: true };
  } else {
    return { name: paramName, deep: false };
  }
}

/**
 * Match `[...page]` -> `page`
 * @deprecated Use matchDynamicName instead which returns {name, deep}
 */
export function matchDeepDynamicRouteName(name: string): string | undefined {
  return name.match(/^\[\.\.\.([^/]+?)\]$/)?.[1];
}

/** Test `/` -> `page` */
export function testNotFound(name: string): boolean {
  return name.endsWith("+not-found");
}

/** Match `(page)` -> `page` */
export function matchGroupName(name: string): string | undefined {
  return name.match(/^(?:[^\\(\\)])*?\(([^\\/]+)\).*?$/)?.[1];
}

/** Match the first array group name `(a,b,c)/(d,c)` -> `'a,b,c'` */
export function matchArrayGroupName(name: string) {
  return name.match(/(?:[^\\(\\)])*?\(?([^\\/()]+,[^\\/()]+)\)?.*?$/)?.[1];
}

export function getNameFromFilePath(name: string): string {
  return removeSupportedExtensions(removeFileSystemDots(name));
}

export function getContextKey(name: string): string {
  // The root path is `` (empty string) so always prepend `/` to ensure
  // there is some value.
  const normal = "/" + getNameFromFilePath(name);
  if (!normal.endsWith("_layout")) {
    return normal;
  }
  return normal.replace(/\/?_layout$/, "");
}

/** Remove `.js`, `.ts`, `.jsx`, `.tsx` */
export function removeSupportedExtensions(name: string): string {
  return name.replace(/(\+(api|spa|ssg|ssr))?\.[jt]sx?$/g, "");
}

// Remove any amount of `./` and `../` from the start of the string
export function removeFileSystemDots(filePath: string): string {
  return filePath.replace(/^(?:\.\.?\/)+/g, "");
}

export function stripGroupSegmentsFromPath(path: string): string {
  return path
    .split("/")
    .reduce((acc, v) => {
      if (matchGroupName(v) == null) {
        acc.push(v);
      }
      return acc;
    }, [] as string[])
    .join("/");
}

export function stripInvisibleSegmentsFromPath(path: string): string {
  return stripGroupSegmentsFromPath(path).replace(/\/?index$/, "");
}

/**
 * Match:
 *  - _layout files, +html, +not-found, string+api, etc
 *  - Routes can still use `+`, but it cannot be in the last segment.
 *  - .d.ts files (type definition files)
 */
export function isTypedRoute(name: string) {
  return (
    !name.startsWith("+") &&
    !name.endsWith(".d.ts") &&
    name.match(/(_layout|[^/]*?\+[^/]*?)\.[tj]sx?$/) === null
  );
}
