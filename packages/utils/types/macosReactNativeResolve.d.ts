export declare function findOneMacosPackageRoot(appRoot: string): string | null;
export declare function requireOneMacosPackageRoot(appRoot: string): string;
/**
 * macOS loads react-native's iOS files, and only for importers inside that
 * package. React Native's own modules keep Platform.ios.js, so Platform.OS
 * stays ios there. The package entry and every importer outside react-native
 * get the one Platform override, where OS is macos. Returns an absolute
 * file, or null to keep the normal resolver.
 */
export declare function macosReactNativeFile(importerFile: string | undefined, source: string, oneMacosRoot: string | null): string | null;
//# sourceMappingURL=macosReactNativeResolve.d.ts.map