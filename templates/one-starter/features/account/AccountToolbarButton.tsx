/**
 * @agent-rule
 * web has no navigation bar to fill — the desktop header owns settings —
 * so this leg renders nothing. the ios sibling
 * (AccountToolbarButton.ios.tsx) owns the trailing gear descriptor; the
 * android sibling (AccountToolbarButton.android.tsx) owns the trailing
 * header element.
 */
export function AccountToolbarButton(_props: { onPress?: () => void }) {
  return null
}
