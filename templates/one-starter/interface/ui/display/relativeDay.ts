// day-granularity relative labels: Today / Yesterday / N days ago, falling
// back to a short date. counts whole calendar days between local midnights
// (not elapsed milliseconds), so a row logged this morning reads Today and
// labels agree with the date shown across a dst boundary.
export function formatRelativeDay(ts: number): string {
  const midnight = (ms: number) => {
    const d = new Date(ms)
    return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
  }
  const days = Math.round((midnight(Date.now()) - midnight(ts)) / 86_400_000)
  if (days <= 0) return 'Today'
  if (days === 1) return 'Yesterday'
  if (days < 7) return `${days} days ago`
  return new Date(ts).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
