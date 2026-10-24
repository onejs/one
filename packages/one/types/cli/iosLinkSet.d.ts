type Catalog = {
    groups: Record<string, {
        components: string[];
        hybrids: string[];
    }>;
};
export declare const IOS_LINK_SET_FILE = "ios/one-link-set.json";
export declare function groupsInBundle(bundle: string, catalog?: Catalog): string[];
export declare function writeIosLinkSet(root: string): string[];
export {};
//# sourceMappingURL=iosLinkSet.d.ts.map