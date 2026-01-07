export type PackageManagerName = "npm" | "yarn" | "pnpm" | "bun";
export declare const detectPackageManager: ({ cwd }?: { cwd?: string }) => Promise<{
  bun: boolean;
  yarn: boolean;
  pnpm: boolean;
  npm: boolean;
}>;
//# sourceMappingURL=detectPackageManager.d.ts.map
