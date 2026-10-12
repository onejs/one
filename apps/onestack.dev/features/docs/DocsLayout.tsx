import { ChevronLeft, ChevronRight } from '~/components/icons'
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
import { useDocsMenu } from '~/features/docs/useDocsMenu'
import { ContainerDocs } from '~/features/site/Containers'

const GITHUB_URL = 'https://github.com'
const REPO_NAME = 'onejs/one'
const BRANCH = 'main'

// the framework docs (/docs) and the native docs (/native) share this layout;
// useDocsMenu picks the sidebar and prev/next routes from the path.
export function DocsLayout() {
  const { currentPath, next, previous, documentVersionPath } = useDocsMenu()
  const file = currentPath === '/native' ? '/native/overview' : currentPath
  const editUrl = `${GITHUB_URL}/${REPO_NAME}/edit/${BRANCH}/apps/onestack.dev/data${file}${documentVersionPath}.mdx`

  return (
    <>
      <TopNav />

      <View
        overflow="hidden"
        marginHorizontal="auto"
        flexDirection="gtMd:row"
        maxWidth={1250}
        zIndex={100}
      >
        <EnsureFlexed />
        <View
          position="fixed gtMd:fixed"
          top="0px gtMd:0px"
          overflow="hidden"
          width="100% gtMd:225px"
          backgroundColor="background gtMd:transparent"
          bottom="gtMd:0px"
          zIndex={9999}
        >
          <YStack
            display="none gtMd:flex"
            marginTop={28}
            height={65}
            maxWidth="fit-content"
            marginLeft="4"
            zIndex={100_000}
          >
            <Link href="/">
              <OneLogo size={0.55} />
            </Link>
          </YStack>

          <ScrollView>
            <View
              display="none gtMd:block"
              contain="paint layout"
              paddingTop="gtMd:38px"
              paddingBottom="gtMd:10"
            >
              <DocsMenuContents />

              <YStack height={200} />
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
            marginTop="14"
            marginBottom="10"
            gap="4"
            justifyContent="space-between"
          >
            {previous && (
              <Link href={previous.route as Href} asChild>
                <XStack
                  className="text-underline-none"
                  render="a"
                  group="card"
                  borderColor="borderColor hover:color6"
                  flex={1}
                  width="50%"
                  padding="5"
                  borderRadius="2"
                  borderWidth={1}
                  backgroundColor="press:backgroundPress"
                  gap="4"
                  transition="100ms"
                  aria-label={`Previous page: ${previous.title}`}
                  alignItems="center"
                >
                  <View opacity={0} left="-4" transition="quickest">
                    <ChevronLeft color="color11" />
                  </View>

                  <View left="-8" transition="quicker">
                    <SizableText userSelect="none" size="5">
                      Previous
                    </SizableText>
                    <SizableText userSelect="none" size="3" color="gray10">
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
                  borderColor="borderColor hover:color6"
                  flex={1}
                  width="50%"
                  padding="5"
                  borderRadius="2"
                  borderWidth={1}
                  backgroundColor="press:backgroundPress"
                  gap="4"
                  transition="100ms"
                  aria-label={`Next page: ${next.title}`}
                  alignItems="center"
                  justifyContent="flex-end"
                >
                  <View right="-8" transition="quicker">
                    <Paragraph userSelect="none" size="5">
                      Next
                    </Paragraph>
                    <Paragraph userSelect="none" size="3" color="gray10">
                      {next.title}
                    </Paragraph>
                  </View>

                  <View opacity={0} right="-4" transition="quickest">
                    <ChevronRight color="color11" />
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
          <Paragraph paddingHorizontal="4" opacity="0.5 hover:1">
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
