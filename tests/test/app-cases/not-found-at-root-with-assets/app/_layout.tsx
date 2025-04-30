import { Slot } from 'one'
import { SchemeProvider, useColorScheme } from '@vxrn/color-scheme'
import { TamaguiProvider } from 'tamagui'
import config from '~/config/tamagui.config'

export default function Layout() {
  return (
    <SchemeProvider>
      <TamaguiRootProvider>
        <Slot />
      </TamaguiRootProvider>
    </SchemeProvider>
  )
}

const TamaguiRootProvider = ({ children }: { children: React.ReactNode }) => {
  const [scheme] = useColorScheme()

  return (
    <TamaguiProvider disableInjectCSS config={config} defaultTheme={scheme}>
      {children}
    </TamaguiProvider>
  )
}
