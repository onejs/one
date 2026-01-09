// Based on https://github.com/zertosh/htmlescape
// Prevents XSS when embedding JSON in <script> tags
// See: https://pragmaticwebsecurity.com/articles/spasecurity/json-stringify-xss.html

const ESCAPE_LOOKUP: Record<string, string> = {
  '\u0026': '\\u0026', // &
  '\u003c': '\\u003c', // <
  '\u003e': '\\u003e', // >
  '\u2028': '\\u2028', // Line separator
  '\u2029': '\\u2029', // Paragraph separator
}

const ESCAPE_REGEX = /[\u0026\u003c\u003e\u2028\u2029]/g

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
export function htmlEscapeJsonString(str: string): string {
  return str.replace(ESCAPE_REGEX, (match) => ESCAPE_LOOKUP[match])
}

/**
 * Safely serializes a value to JSON for embedding in HTML <script> tags.
 */
export function safeJsonStringify(value: unknown): string {
  return htmlEscapeJsonString(JSON.stringify(value))
}
