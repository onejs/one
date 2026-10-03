// safe-area lengths every app layout should use instead of raw
// env(safe-area-inset-*): WebKit only resolves env() in the TOP document, so
// the dynamic island. the preview host mirrors the real insets into the guest
// as --safe-area-inset-* custom properties; these vars prefer that bridge and
// fall back to env() so the same code is correct deployed AND in the preview.
// usage: pt="calc(50px + var(--safe-area-top))".
export const SAFE_AREA_VARS = `:root {
  --safe-area-top: var(--safe-area-inset-top, env(safe-area-inset-top, 0px));
  --safe-area-right: var(--safe-area-inset-right, env(safe-area-inset-right, 0px));
  --safe-area-bottom: var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px));
  --safe-area-left: var(--safe-area-inset-left, env(safe-area-inset-left, 0px));
}`

// shared web link preset for every example + template — one source of truth
// instead of a per-app `a { text-decoration: none }` patch. mirrors
// a button never underlines, and only links inside prose (paragraphs / list items
// / table cells + tamagui's Paragraph) underline — so docs stay readable while
// nav / cta / pagination links stay clean. inject it into the root <style>
// alongside each app's @font-face css.
export const LINK_UNDERLINE_RESET = `a {
  color: inherit;
  text-decoration: none;
}
a:has(> button),
a.t_Link:has(> button) {
  text-decoration: none !important;
}
article :where(p, li, td) > a,
.is_Paragraph a {
  text-decoration: underline;
  text-decoration-color: var(--color-9);
  text-decoration-thickness: 1px;
  text-underline-offset: 3px;
  transition: text-decoration-color 0.15s ease;
}
article :where(p, li, td) > a:hover,
.is_Paragraph a:hover {
  text-decoration-color: var(--color);
}`
