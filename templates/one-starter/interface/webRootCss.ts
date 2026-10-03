// shared safe-area values accept platform-provided insets before browser values.
export const SAFE_AREA_VARS = `:root {
  --safe-area-top: var(--safe-area-inset-top, env(safe-area-inset-top, 0px));
  --safe-area-right: var(--safe-area-inset-right, env(safe-area-inset-right, 0px));
  --safe-area-bottom: var(--safe-area-inset-bottom, env(safe-area-inset-bottom, 0px));
  --safe-area-left: var(--safe-area-inset-left, env(safe-area-inset-left, 0px));
}`

// underline prose links while keeping navigation links plain.
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
