import { ChevronLeft, ChevronRight } from '@tamagui/lucide-icons-2'
import { type Href, Link, Slot } from 'one'
import type { ReactNode } from 'react'
import {
  EnsureFlexed,
  Paragraph,
  ScrollView,
  SizableText,
  View,
  XStack,
  YStack,
} from 'tamagui'
import { TopNav } from '~/components/TopNav'
import { OneLogo } from '~/features/brand/Logo'
import { DocsMenuContents } from '~/features/docs/DocsMenuContents'
import { DocsSectionTabs } from '~/features/docs/DocsSectionTabs'
import { nativeRoutes } from '~/features/docs/nativeRoutes'
import { useNativeMenu } from '~/features/docs/useNativeMenu'
import { ContainerDocs } from '~/features/site/Containers'

const GITHUB_URL = 'https://github.com'
const REPO_NAME = 'onejs/one'
const BRANCH = 'v2-beta'

export default function NativeLayout() {
  const { currentPath, next, previous } = useNativeMenu()
  const slug = currentPath.replace('/native', '') || '/overview'
  const editUrl = `${GITHUB_URL}/${REPO_NAME}/edit/${BRANCH}/apps/onestack.dev/data/native${slug}.mdx`

  return (
    <>
      <TopNav />

      <View
        overflow="hidden"
        mx="auto"
        $gtMd={{
          flexDirection: 'row',
        }}
        maw={1250}
        zi={100}
      >
        <EnsureFlexed />
        <View
          animateOnly={['left']}
          position={'fixed' as any}
          top={0}
          zi={9999}
          overflow="hidden"
          width="100%"
          backgroundColor="$background"
          $gtMd={{
            backgroundColor: 'transparent',
            position: 'fixed' as any,
            top: 0,
            bottom: 0,
            width: 225,
          }}
        >
          <YStack
            dsp="none"
            $gtMd={{
              dsp: 'flex',
            }}
            mt={28}
            h={65}
            maxWidth="fit-content"
            zi={100_000}
            ml="$4"
          >
            <Link href="/">
              <OneLogo size={0.55} minimal />
            </Link>
          </YStack>

          <ScrollView>
            <View
              display="none"
              contain="paint layout"
              $gtMd={{
                display: 'block',
                pt: 38,
                pb: '$10',
              }}
            >
              <DocsSectionTabs />
              <DocsMenuContents routes={nativeRoutes} />

              <YStack h={200} />
            </View>
          </ScrollView>
        </View>
      </View>

      <ContainerDocs>
        {/* <Spacer $md={{ dsp: 'none' }} /> */}
        <Slot />

        {(previous || next) && (
          <XStack
            className="text-decoration-none"
            aria-label="Pagination navigation"
            mt="$14"
            mb="$10"
            jc="space-between"
            gap="$4"
          >
            {previous && (
              <Link href={previous.route as Href} asChild>
                <XStack
                  className="text-underline-none"
                  render="a"
                  group="card"
                  hoverStyle={{
                    borderColor: '$color6',
                  }}
                  flex={1}
                  width="50%"
                  p="$5"
                  borderRadius="$2"
                  borderWidth={1}
                  borderColor="$borderColor"
                  pressStyle={{
                    backgroundColor: '$backgroundPress',
                  }}
                  aria-label={`Previous page: ${previous.title}`}
                  ai="center"
                  gap="$4"
                  transition="100ms"
                >
                  <View o={0} l="$-4" transition="quickest">
                    <ChevronLeft color="$color11" />
                  </View>

                  <View l="$-8" transition="quicker">
                    <SizableText userSelect="none" size="$5">
                      Previous
                    </SizableText>
                    <SizableText userSelect="none" size="$3" color="$gray10">
                      {previous.title}
                    </SizableText>
                  </View>
                </XStack>
              </Link>
            )}

            {next && (
              <Link href={next.route as Href} asChild>
                <XStack
                  className="text-underline-none"
                  render="a"
                  group="card"
                  hoverStyle={{
                    borderColor: '$color6',
                  }}
                  flex={1}
                  width="50%"
                  p="$5"
                  borderRadius="$2"
                  borderWidth={1}
                  borderColor="$borderColor"
                  pressStyle={{
                    backgroundColor: '$backgroundPress',
                  }}
                  aria-label={`Next page: ${next.title}`}
                  ai="center"
                  jc="flex-end"
                  gap="$4"
                  transition="100ms"
                >
                  <View r="$-8" transition="quicker">
                    <Paragraph userSelect="none" size="$5">
                      Next
                    </Paragraph>
                    <Paragraph userSelect="none" size="$3" color="$gray10">
                      {next.title}
                    </Paragraph>
                  </View>

                  <View o={0} r="$-4" transition="quickest">
                    <ChevronRight color="$color11" />
                  </View>
                </XStack>
              </Link>
            )}
          </XStack>
        )}

        <Link
          href={editUrl as Href}
          // @ts-ignore
          title="Edit this page on GitHub."
          rel="noopener noreferrer"
          target="_blank"
        >
          <Paragraph
            px="$4"
            o={0.5}
            hoverStyle={{
              o: 1,
            }}
          >
            Edit this page on GitHub.
          </Paragraph>
        </Link>
      </ContainerDocs>
    </>
  )
}

export type NavItemProps = {
  children: ReactNode
  active?: boolean
  href: string
  pending?: boolean
  external?: boolean
}
