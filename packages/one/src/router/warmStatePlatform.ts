export function attachWarmStateLifecycle(onBackground: () => void): () => void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return () => {}
  }

  const handleVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      onBackground()
    }
  }

  document.addEventListener('visibilitychange', handleVisibilityChange)
  window.addEventListener('pagehide', onBackground)

  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange)
    window.removeEventListener('pagehide', onBackground)
  }
}

export function getNativeInitialURL(): Promise<string | null> {
  return Promise.resolve(null)
}
