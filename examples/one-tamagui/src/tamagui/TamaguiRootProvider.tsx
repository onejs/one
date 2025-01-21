import { useColorScheme } from '@vxrn/color-scheme'
import { TamaguiProvider } from 'tamagui'
import config from './tamagui.config'

export const TamaguiRootProvider = ({ children }: { children: React.ReactNode }) => {
  const [scheme] = useColorScheme()

  return (
    <TamaguiProvider disableInjectCSS config={config} defaultTheme={scheme}>
      {children}
    </TamaguiProvider>
  )
}
