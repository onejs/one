/**
 * Sentinel the MDX parser substitutes for spaces inside expression and JSX
 * attribute-expression values (see `PHANTOM_SPACE` in
 * satteri-pulldown-cmark/src/mdx.rs). mdast and hast keep the sentinel in the
 * stored value; readers and visitors restore the real space on the way out.
 * Both plugin-facing paths (direct walk match and materialized child) must
 * restore it so a node's `value` reads the same regardless of how it's reached.
 */
const PHANTOM_SPACE = '\uF002'
/** Restore phantom-space sentinels to real spaces, allocating only when present. */
export function restorePhantomSpaces(value) {
  return value.includes(PHANTOM_SPACE) ? value.replaceAll(PHANTOM_SPACE, ' ') : value
}
