// in-memory entries behind the feed's create/edit flow. production binds a
// flow like this to zero, not to a module store.
export type PatternEntry = {
  id: string
  title: string
  note: string
  updatedAt: number
}

let entries: PatternEntry[] = [
  {
    id: 'pe-seed-1',
    title: 'Dinner with Sam',
    note: 'Try the new ramen bar',
    updatedAt: 1,
  },
  { id: 'pe-seed-2', title: 'Water the ferns', note: '', updatedAt: 2 },
]
let sequence = entries.length

export function getPatternEntry(id: string): PatternEntry | undefined {
  return entries.find((entry) => entry.id === id)
}

export function savePatternEntry(input: {
  id?: string
  title: string
  note: string
}): PatternEntry {
  const existing = input.id ? getPatternEntry(input.id) : undefined
  if (existing) {
    const next = {
      ...existing,
      title: input.title,
      note: input.note,
      updatedAt: Date.now(),
    }
    entries = entries.map((entry) => (entry.id === existing.id ? next : entry))
    return next
  }
  sequence += 1
  const created = {
    id: `pe-${sequence}`,
    title: input.title,
    note: input.note,
    updatedAt: Date.now(),
  }
  entries = [created, ...entries]
  return created
}
