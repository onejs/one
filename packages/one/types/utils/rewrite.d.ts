/**
 * URL rewriting utilities for handling subdomain and path rewrites
 */
export interface RewriteRule {
    pattern: RegExp;
    target: (match: RegExpMatchArray, host?: string) => string;
    isSubdomain: boolean;
}
/**
 * Parse a rewrite rule string into a pattern and target function
 * Examples:
 * - '*.start.chat': '/server/*' (subdomain wildcard)
 * - 'admin.app.com': '/admin' (exact subdomain)
 * - '/old/*': '/new/*' (path rewrite)
 */
export declare function parseRewriteRule(ruleKey: string, ruleValue: string): RewriteRule;
/**
 * Apply rewrite rules to a URL
 * Returns a new URL if a rule matches, null otherwise
 */
export declare function applyRewrites(url: URL, rewrites: Record<string, string>): URL | null;
/**
 * Reverse a rewrite for Link components
 * Converts internal paths back to external URLs
 * Example: '/server/tamagui/docs' → 'https://tamagui.start.chat/docs'
 */
export declare function reverseRewrite(path: string, rewrites: Record<string, string>, currentHost?: string): string;
/**
 * Get rewrite configuration from environment
 */
export declare function getRewriteConfig(): Record<string, string>;
//# sourceMappingURL=rewrite.d.ts.map