import type { HybridObject } from 'react-native-nitro-modules'

export interface QuickActionItem {
  readonly id: string
  readonly title: string
  readonly subtitle?: string
}

export interface OneQuickActions extends HybridObject<{ ios: 'swift'; android: 'kotlin' }> {
  setItems(items: QuickActionItem[]): Promise<void>
  getItems(): Promise<QuickActionItem[]>
  getInitialAction(): string | undefined
  clearInitialAction(): void
  addListener(listener: (value: string) => void): () => void
}
