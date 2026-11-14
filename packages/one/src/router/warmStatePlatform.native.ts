import { AppState, Linking, type AppStateStatus } from 'react-native'

export function attachWarmStateLifecycle(onBackground: () => void): () => void {
  if (typeof AppState?.addEventListener !== 'function') {
    return () => {}
  }

  const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
    if (nextState === 'background' || nextState === 'inactive') {
      onBackground()
    }
  })

  return () => {
    subscription?.remove?.()
  }
}

export function getNativeInitialURL(): Promise<string | null> {
  if (typeof Linking?.getInitialURL !== 'function') {
    return Promise.resolve(null)
  }
  return Promise.race([
    Linking.getInitialURL(),
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 150)
    }),
  ])
}
