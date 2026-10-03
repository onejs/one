import { SizableText, YStack } from 'tamagui'
import { H1 } from 'tamagui'
import { SiteShell } from '~/interface/site/SiteShell'
import type { ReactNode } from 'react'

type LegalPageProps = {
  title: string
  children: ReactNode
}

export const LegalPage = ({ title, children }: LegalPageProps) => {
  return (
    <SiteShell>
      <YStack gap={18} maxW={760} width="100%" mx="auto">
        <H1 fontFamily="heading" size="10" fontWeight="700">
          {title}
        </H1>
        <YStack gap={18} mt={18}>
          {children}
        </YStack>
      </YStack>
    </SiteShell>
  )
}

type LegalSectionProps = {
  title: string
  children: ReactNode
}

export const LegalSection = ({ title, children }: LegalSectionProps) => {
  return (
    <YStack gap={7}>
      <SizableText fontFamily="body" size="5" fontWeight="600" color="color">
        {title}
      </SizableText>
      {children}
    </YStack>
  )
}

export const LegalText = ({ children }: { children: ReactNode }) => {
  return (
    <SizableText fontFamily="body" size="4" color="color" lineHeight="4">
      {children}
    </SizableText>
  )
}

export const LegalList = ({ children }: { children: ReactNode }) => {
  return (
    <YStack gap={7} pl={18}>
      {children}
    </YStack>
  )
}
