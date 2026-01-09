/**
 * Escapes a JSON string for safe embedding in HTML <script> tags.
 *
 * JSON.stringify doesn't escape characters like < and >, which means
 * a string containing "</script>" can break out of a script tag and
 * allow arbitrary code execution.
 *
 * This function escapes those characters as unicode escape sequences
 * (e.g., < becomes \u003c) which are valid JSON but won't be parsed
 * as HTML.
 */
export declare function htmlEscapeJsonString(str: string): string;
/**
 * Safely serializes a value to JSON for embedding in HTML <script> tags.
 */
export declare function safeJsonStringify(value: unknown): string;
//# sourceMappingURL=htmlEscape.d.ts.map