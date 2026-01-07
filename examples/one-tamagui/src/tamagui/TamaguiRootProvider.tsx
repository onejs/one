import { useUserScheme } from '@vxrn/color-scheme'
import { TamaguiProvider } from 'tamagui'
import config from './tamagui.config'

export const TamaguiRootProvider = ({ children }: { children: React.ReactNode }) => {
  const userScheme = useUserScheme()

  return (
    <TamaguiProvider disableInjectCSS config={config} defaultTheme={userScheme.value}>
      {children}
    </TamaguiProvider>
  )
}
