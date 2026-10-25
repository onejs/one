import type { HingeState, SizeClass } from './types'

// windows without size classes or hinges (web and macOS): always regular, never a hinge
const DEFAULT_SIZE_CLASS: SizeClass = {
  horizontal: 'regular',
  vertical: 'regular',
}

export function useSizeClass(): SizeClass {
  return DEFAULT_SIZE_CLASS
}

export async function getSizeClass(): Promise<SizeClass> {
  return DEFAULT_SIZE_CLASS
}

export function useHinge(): HingeState | null {
  return null
}

export async function getHinge(): Promise<HingeState | null> {
  return null
}

export function onHingeChange(_callback: (hinge: HingeState | null) => void): () => void {
  return () => {}
}
