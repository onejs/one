// minimal "time ago" formatter for instants — enough for feed rendering.
// takes an instant (epoch milliseconds or a date), never a string: calendar
// days stay in dateOnly so a day picked in one zone cannot shift en route.
export function formatDistanceToNow(input: number | Date): string {
  const ms = typeof input === 'number' ? input : input.getTime()
  const diff = Date.now() - ms
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m`
  const hr = Math.floor(min / 60)
  if (hr < 24) return `${hr}h`
  const day = Math.floor(hr / 24)
  if (day < 7) return `${day}d`
  const wk = Math.floor(day / 7)
  if (wk < 4) return `${wk}w`
  const mo = Math.floor(day / 30)
  if (mo < 12) return `${mo}mo`
  const yr = Math.floor(day / 365)
  return `${yr}y`
}
