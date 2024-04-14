import { ExpoRoot } from '@vxrn/expo-router'

import { useExpoContext } from './hooks/useExpoContext'

// @ts-ignore
const modules = import.meta.glob('../app/**/*.tsx')

export function App() {
  const context = useExpoContext(modules)

  if (!context) {
    return null
  }

  return (
    <>
      <ExpoRoot context={context} />
    </>
  )
}
