/**
 * On Windows, micromatch.makeRe() produces regex patterns with `[\\/]` or `[^\\/]`
 * instead of `\/` and `[^/]`. Normalize them so the startsWith check works.
 */
export function normalizeReSource(source: string): string {
  return source.replace(/\[\\\\\/\]/g, '\\/').replace(/\[\^\\\\\/\]/g, '[^/]')
}
