// instant-date display for scheduled days: short dates and day counts.
export function formatDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

export function formatShortDate(ms: number): string {
  return new Date(ms).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

export function daysUntil(ms: number): number {
  const now = Date.now()
  return Math.ceil((ms - now) / (1000 * 60 * 60 * 24))
}

export function formatRelativeDate(ms: number): string {
  const days = daysUntil(ms)
  if (days < 0) return `${Math.abs(days)}d ago`
  if (days === 0) return 'today'
  if (days === 1) return 'tomorrow'
  return `in ${days}d`
}
