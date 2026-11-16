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
  // the url arrives once the js thread is free after the first render, which
  // took 379ms in a release app, so the bound only guards a call that never answers
  return Promise.race([
    Linking.getInitialURL(),
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), 3000)
    }),
  ])
}
