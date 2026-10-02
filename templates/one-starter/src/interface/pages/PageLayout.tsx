import { isWeb } from 'tamagui'
import { GradientBackground } from '../backgrounds/GradientBackground'
import type { ReactNode } from 'react'
export type PageLayoutProps = {
  children: ReactNode
  useImage?: boolean
}
export const PageLayout = ({ children, useImage = false }: PageLayoutProps) => {
  if (!isWeb) {
    return (
      <GradientBackground useInsets={false} useImage={useImage}>
        {children}
      </GradientBackground>
    )
  }
  return <>{children}</>
}
