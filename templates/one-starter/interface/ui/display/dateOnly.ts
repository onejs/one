// calendar-day keys: a day the user picks is a `YYYY-MM-DD` string in the
// device calendar, never an instant. keep it a string end to end so a day
// stored in one zone reads back as the same day in every zone.
const DATE_ONLY_RE = /^(\d{4})-(\d{2})-(\d{2})$/

// a checked calendar-day key. every picker leg needs a real day (SwiftUI's
// DatePicker has no empty state), so an empty or unchecked string is a type
// error at the call site instead of a crash on one platform.
export type DateOnlyKey = `${number}-${string}-${string}`

export type CalendarDateParts = {
  year: number
  month: number
  day: number
}

export type CalendarMonth = {
  year: number
  month: number
  monthStartKey: string
  nextMonthStartKey: string
  monthStartMs: number
  nextMonthStartMs: number
  monthLabel: string
}

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`
}

// local-calendar key for a date, e.g. 2026-09-22
export function toDateOnlyKey(d: Date): DateOnlyKey {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

// today's key in the device calendar, derived at runtime
export function todayDateOnly(): DateOnlyKey {
  return toDateOnlyKey(new Date())
}

// split a stored key without constructing an instant; throws on bad input
export function parseDateOnly(key: string): CalendarDateParts {
  const m = DATE_ONLY_RE.exec(key)
  if (!m) throw new Error(`bad date-only key: ${key}`)
  const year = Number(m[1])
  const month = Number(m[2])
  const day = Number(m[3])
  if (month < 1 || month > 12) throw new Error(`bad date-only key: ${key}`)
  const dim = new Date(year, month, 0).getDate()
  if (day < 1 || day > dim) throw new Error(`bad date-only key: ${key}`)
  return { year, month, day }
}

// check a stored key at the boundary before it reaches a picker; throws on
// bad input
export function dateOnlyKey(key: string): DateOnlyKey {
  const { year, month, day } = parseDateOnly(key)
  return `${year}-${pad2(month)}-${pad2(day)}`
}

// display a stored key without parsing it as an instant; formats the same
// calendar day the filter bounds use
export function formatDateOnly(key: string, locale?: string): string {
  const { year, month, day } = parseDateOnly(key)
  return new Date(year, month - 1, day).toLocaleDateString(locale, {
    day: 'numeric',
    month: 'numeric',
    year: 'numeric',
  })
}

// one month model for filter bounds and the displayed label; month is 1-12.
// bounds and label share the same year/month, so the label can never drift
// from the filter the way a utc-midnight boundary formatted in the device
// zone does.
export function monthModel(year: number, month: number, locale?: string): CalendarMonth {
  if (month < 1 || month > 12) throw new Error(`bad month: ${month}`)
  const nextYear = month === 12 ? year + 1 : year
  const nextMonth = month === 12 ? 1 : month + 1
  return {
    year,
    month,
    monthStartKey: `${year}-${pad2(month)}-01`,
    nextMonthStartKey: `${nextYear}-${pad2(nextMonth)}-01`,
    monthStartMs: new Date(year, month - 1, 1).getTime(),
    nextMonthStartMs: new Date(nextYear, nextMonth - 1, 1).getTime(),
    monthLabel: new Date(year, month - 1, 1).toLocaleString(locale, {
      month: 'long',
      year: 'numeric',
    }),
  }
}

// current month in the device calendar, derived at runtime
export function currentMonthModel(locale?: string): CalendarMonth {
  const now = new Date()
  return monthModel(now.getFullYear(), now.getMonth() + 1, locale)
}
