import '@tamagui/core/reset.css'
import { SchemeProvider, useUserScheme } from '@vxrn/color-scheme'
import { TamaguiProvider } from 'tamagui'
import { LoadProgressBar, Slot } from 'one'
import config from '../src/tamagui.config'

export default function Layout() {
  return (
    <>
      <LoadProgressBar />
      <SchemeProvider>
        <TamaguiRootProvider>
          <Slot />
        </TamaguiRootProvider>
      </SchemeProvider>
    </>
  )
}

const TamaguiRootProvider = ({ children }: { children: React.ReactNode }) => {
  const userScheme = useUserScheme()

  return (
    <TamaguiProvider disableInjectCSS config={config} defaultTheme={userScheme.value}>
      {children}
    </TamaguiProvider>
  )
}
