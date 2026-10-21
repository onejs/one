import type { One } from '../vite/types';
export declare function urlPathToFilePath(urlPath: string): string;
export declare function dedupePreloadArtifacts(clientDir: string, routes: Pick<One.RouteBuildInfo, 'preloadPath' | 'cssPreloadPath'>[]): Promise<number>;
//# sourceMappingURL=preloadArtifacts.d.ts.map