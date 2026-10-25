import type { LinkSetCatalog } from './iosLinkSetAnalysis';
export declare const IOS_LINK_SET_FILE = "ios/one-link-set.json";
export declare const IOS_LINK_SET_REPORT_ENV = "ONE_IOS_LINK_SET_REPORT";
export declare function readCatalog(): LinkSetCatalog;
export declare function oneDirectory(): string;
export declare function compiledGroups(podsRoot: string, configuration: string): string[] | undefined;
export declare function assertLinkSet(needed: string[], env?: NodeJS.ProcessEnv): void;
export declare function writeIosLinkSet(root: string): string[];
//# sourceMappingURL=iosLinkSet.d.ts.map