export declare function findOneMacosPackageRoot(appRoot: string): string | null;
export declare function requireOneMacosPackageRoot(appRoot: string): string;
/**
 * macOS loads react-native's iOS files, and only for importers inside that
 * package. React Native's own modules keep Platform.ios.js. The package entry
 * and importers outside react-native get the one-macos Platform override.
 * Returns an absolute file, or null to keep the normal resolver.
 */
export declare function macosReactNativeFile(importerFile: string | undefined, source: string, oneMacosRoot: string | null): string | null;
