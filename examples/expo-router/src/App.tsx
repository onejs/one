import { ExpoRoot } from '@vite-react-native/expo-router'

import { useExpoContext } from './useExpoContext'

// @ts-ignore
const modules = import.meta.glob('../app/**/*.tsx')

export function App() {
  const context = useExpoContext(modules)

  if (!context) {
    return null
  }

  return <ExpoRoot context={context} />
}
