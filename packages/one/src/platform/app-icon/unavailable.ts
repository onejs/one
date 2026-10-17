import type { AppIconEntry } from './types'

export type { AppIconEntry }

export const AppIcon = Object.freeze({
  isSupported: (): Promise<boolean> => Promise.resolve(false),
  getCurrentName: (): Promise<string | undefined> => Promise.resolve(''),
  setIcon: (_name?: string): Promise<void> => Promise.resolve(),
  list: (): AppIconEntry[] => [],
})
