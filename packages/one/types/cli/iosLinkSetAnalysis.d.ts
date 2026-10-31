export type LinkSetCatalog = {
    groups: Record<string, {
        components: string[];
        hybrids: string[];
        uses?: string[];
        modifiers?: string[];
        slots?: string[];
        values?: string[];
    }>;
};
export type LinkSetUsage = {
    names: Set<string>;
    keys: Set<string>;
    all: boolean;
};
export declare const emptyUsage: () => LinkSetUsage;
export declare function catalogNames(catalog: LinkSetCatalog): {
    names: Map<string, string[]>;
    keys: Map<string, string[]>;
};
export declare function mightUseGroups(code: string, keys: Iterable<string>, pattern?: RegExp): boolean;
export declare function keyPattern(keys: Iterable<string>): RegExp;
export declare function analyzeModule(code: string, filename: string, keys: ReadonlySet<string>, usage: LinkSetUsage): void;
export declare function groupsForUsage(usage: LinkSetUsage, catalog: LinkSetCatalog): string[];
//# sourceMappingURL=iosLinkSetAnalysis.d.ts.map