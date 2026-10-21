export declare function findOneMacosPackageRoot(appRoot: string): string | null;
/**
 * macOS loads react-native's iOS implementation, except for files the
 * one-macos package overrides. App code and other packages do not get this
 * fallback. Returns an absolute file, or null to keep the normal resolver.
 */
export declare function macosReactNativeFile(importerFile: string | undefined, source: string, oneMacosRoot: string | null): string | null;
