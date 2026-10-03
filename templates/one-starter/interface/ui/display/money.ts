// money crosses every boundary as integer cents in a column named for its unit.
// divide by 100 only at display, never beside a screen or component.
export function formatCents(cents: number, currency = 'USD', locale?: string): string {
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
  }).format(cents / 100)
}

// parse what the user typed into an amount field as integer cents. returns
// null for anything that is not a plain non-negative amount with at most two
// decimals ("", "abc", "-5", "1.234"), so a sheet disables its submit instead
// of saving a different number than the one on screen.
export function centsFromInput(text: string): number | null {
  const trimmed = text.trim()
  if (!/^(\d+(\.\d{0,2})?|\.\d{1,2})$/.test(trimmed)) {
    return null
  }
  return Math.round(Number(trimmed) * 100)
}
