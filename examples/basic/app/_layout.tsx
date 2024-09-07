import '@tamagui/core/reset.css'
import '~/features/styles/tamagui.css'
import './_layout.css'

import { SchemeProvider, useColorScheme } from '@vxrn/color-scheme'
import { TamaguiProvider } from 'tamagui'
import { PageLoadProgressBar } from 'vxs'
import { HomeLayout } from '~/features/home/HomeLayout'
import { zero, ZeroProvider } from '~/features/zero/client'
import { useQuery } from '~/features/zero/query'
import config from '../config/tamagui.config'

export default function Layout() {
  return (
    <>
      <PageLoadProgressBar />

      <ZeroProvider>
        <SchemeProvider>
          <TamaguiRootProvider>
            <HomeLayout />
            <TestZero />
          </TamaguiRootProvider>
        </SchemeProvider>
      </ZeroProvider>
    </>
  )
}

const TestZero = () => {
  const results = useQuery(zero.query.posts.limit(10))

  console.log('results', results)

  return null
}

const TamaguiRootProvider = ({ children }: { children: React.ReactNode }) => {
  const [scheme] = useColorScheme()

  return (
    <TamaguiProvider disableInjectCSS config={config} defaultTheme={scheme}>
      {children}
    </TamaguiProvider>
  )
}
