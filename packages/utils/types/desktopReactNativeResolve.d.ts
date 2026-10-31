export type DesktopPlatform = 'macos' | 'linux';
export declare function findOnePackageRoot(appRoot: string): string | null;
export declare function requireOnePackageRoot(appRoot: string, platform: DesktopPlatform): string;
/**
 * The desktop platforms load react-native's iOS files, and only for importers
 * inside that package. React Native's own modules keep Platform.ios.js, so
 * Platform.OS stays ios there. The package entry and every importer outside
 * react-native get the one Platform override, where OS is the desktop
 * platform. Returns an absolute file, or null to keep the normal resolver.
 */
export declare function desktopReactNativeFile(importerFile: string | undefined, source: string, oneRoot: string | null, platform: DesktopPlatform): string | null;
//# sourceMappingURL=desktopReactNativeResolve.d.ts.map