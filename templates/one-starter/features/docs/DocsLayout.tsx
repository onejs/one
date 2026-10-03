import { Separator, SizableText, XStack, YStack } from 'tamagui'
import { Link } from '~/interface/app/Link'
import { docsRoutes, findDocAdjacent } from './docsRoutes'
import type { ReactNode } from 'react'

export function DocsLayout({
  slug,
  title,
  children,
}: {
  slug: string
  title?: string
  children: ReactNode
}) {
  const { previous, next } = findDocAdjacent(slug)
  return (
    <XStack width="100%" maxW={1100} mx="auto" px={18} py="8" gap="8" flexWrap="wrap md:nowrap">
      <YStack width="100% md:220px" position="sticky" t={46} height="min-content">
        <SizableText size="2" color="color-10" fontWeight="700" textTransform="uppercase" mb={7}>
          Docs
        </SizableText>
        <YStack gap={7}>
          {docsRoutes.map((r) => (
            <Link key={r.slug} href={`/docs/${r.slug}`}>
              <SizableText
                size="4"
                color={`${r.slug === slug ? 'color' : 'color-10'}`}
                fontWeight={r.slug === slug ? '700' : '400'}
              >
                {r.title}
              </SizableText>
            </Link>
          ))}
        </YStack>
      </YStack>

      <YStack flex={1} maxW={760}>
        {title && (
          <SizableText size="1" color="color-9" fontWeight="600" textTransform="uppercase" mb={7}>
            Docs
          </SizableText>
        )}
        {children}
        <Separator my="8" />
        <XStack justify="space-between" gap={18}>
          {previous ? (
            <Link href={`/docs/${previous.slug}`}>
              <YStack>
                <SizableText size="1" color="color-9">
                  Previous
                </SizableText>
                <SizableText size="4" color="color">
                  ← {previous.title}
                </SizableText>
              </YStack>
            </Link>
          ) : (
            <YStack />
          )}
          {next ? (
            <Link href={`/docs/${next.slug}`}>
              <YStack items="flex-end">
                <SizableText size="1" color="color-9">
                  Next
                </SizableText>
                <SizableText size="4" color="color">
                  {next.title} →
                </SizableText>
              </YStack>
            </Link>
          ) : (
            <YStack />
          )}
        </XStack>
      </YStack>
    </XStack>
  )
}
