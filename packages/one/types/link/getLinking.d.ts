export type OneLinkingConfig = {
    /**
     * Custom app scheme or schemes. Each scheme is expanded to double- and
     * triple-slashed URL prefixes.
     */
    scheme?: string | string[];
    /**
     * Fully qualified URL prefixes to strip before matching routes.
     *
     * For host-bearing custom scheme URLs, include the host:
     * `myapp://app`.
     */
    prefixes?: string[];
    filter?: (url: string) => boolean;
};
export type NormalizedOneLinkingConfig = {
    prefixes: string[];
    filter?: (url: string) => boolean;
};
export declare function getLinking(config?: OneLinkingConfig): OneLinkingConfig;
export declare function normalizeLinkingConfig(config: OneLinkingConfig | undefined, defaultPrefixes?: string[]): NormalizedOneLinkingConfig;
//# sourceMappingURL=getLinking.d.ts.map