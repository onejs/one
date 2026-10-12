// argument checks shared by the web and native key-value stores. the thrown
// text is the contract tests assert on both platforms.

const NAME_PATTERN = /^[A-Za-z0-9._-]{1,128}$/

export type DatabaseKeyValue = Readonly<{
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  getAllKeys(): string[]
  clear(): void
  close(): void
}>

export function requireName(name: unknown): string {
  if (typeof name !== 'string' || !NAME_PATTERN.test(name)) {
    throw new Error(
      'Database.openKeyValue: name must be 1-128 letters, digits, dots, underscores, or hyphens'
    )
  }
  return name
}

export function requireKey(verb: string, key: unknown): string {
  if (typeof key !== 'string' || key === '') {
    throw new Error(`${verb}: key must be a non-empty string`)
  }
  return key
}

export function requireValue(verb: string, value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error(`${verb}: value must be a string`)
  }
  return value
}

export function assertOpen(verb: string, closed: boolean): void {
  if (closed) throw new Error(`${verb}: key-value store is closed`)
}
