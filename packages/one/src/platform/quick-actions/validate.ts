import type { QuickActionItem } from '../specs/OneQuickActions.nitro'

// keep runtime argument errors identical on web and native.
export function assertQuickActionItems(value: unknown): asserts value is QuickActionItem[] {
  if (!Array.isArray(value)) {
    throw new TypeError('QuickActions.setItems: items must be an array')
  }
  const seen = new Set<string>()
  for (const item of value) {
    if (!item || typeof item !== 'object' ||
      typeof item.id !== 'string' || !item.id.trim() ||
      typeof item.title !== 'string' || !item.title.trim() ||
      (item.subtitle !== undefined && typeof item.subtitle !== 'string') ||
      seen.has(item.id)) {
      throw new TypeError('QuickActions.setItems: items require unique non-empty id and title with optional string subtitle')
    }
    seen.add(item.id)
  }
}

export function assertQuickActionListener(value: unknown): asserts value is (id: string) => void {
  if (typeof value !== 'function') {
    throw new TypeError('QuickActions.addListener: listener must be a function')
  }
}
