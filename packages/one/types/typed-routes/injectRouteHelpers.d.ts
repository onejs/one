export type InjectMode = 'type' | 'runtime'
/**
 * Injects route type helpers into a route file if they don't already exist.
 *
 * This function:
 * - Checks if the file already has `type Route` or `const route` declarations
 * - Adds them if missing with proper spacing (blank line after imports)
 * - Tries to add imports to existing `import {} from 'one'` statements
 * - Does NOT modify existing loader code - that's up to the user
 */
export declare function injectRouteHelpers(
  filePath: string,
  routePath: string,
  mode: InjectMode
): Promise<boolean>
//# sourceMappingURL=injectRouteHelpers.d.ts.map
