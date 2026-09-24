import { Search } from '@tamagui/lucide-icons-2'
import { useContext, useRef } from 'react'
import { Separator, SizableText, styled, View, XStack, YStack } from 'tamagui'
import { Link, usePathname } from 'one'
import { OneLogo } from '~/features/brand/Logo'
import { ReleaseStatus } from '~/components/ReleaseStatus'
import { SearchContext } from '~/features/search/SearchContext'
import { HeaderMenu } from '~/features/site/HeaderMenu'
import { SocialLinksRow } from '~/features/site/SocialLinksRow'
import { ToggleThemeButton } from '~/features/theme/ThemeToggleButton'

const SimpleButton = styled(View, {
  role: 'button',
  cursor: 'pointer',
  pos: 'relative',
  pe: 'auto',
  w: 42,
  h: 42,
  ai: 'center',
  jc: 'center',
  br: '$10',

  hoverStyle: {
    bg: '$color3',
  },

  pressStyle: {
    bg: '$color2',
  },
})

const DocsNativeTabs = () => {
  const pathname = usePathname()
  const isNative = pathname.startsWith('/native')
  const isDocs = pathname.startsWith('/docs') || isNative
  if (!isDocs) return null

  return (
    <XStack
      pe="auto"
      ai="center"
      gap="$1"
      mr="$2"
      p="$1"
      br="$10"
      bg="$color2"
      $sm={{ dsp: 'none' }}
      role="tablist"
      aria-label="Documentation section"
    >
      <TopNavTab href="/docs/introduction" active={!isNative} label="Docs" />
      <TopNavTab href="/native" active={isNative} label="Native" />
    </XStack>
  )
}

const TopNavTab = ({
  href,
  active,
  label,
}: {
  href: string
  active: boolean
  label: string
}) => {
  return (
    <Link href={href as any} asChild>
      <XStack
        render="a"
        ai="center"
        jc="center"
        px="$3"
        py="$1.5"
        br="$8"
        cursor="pointer"
        bg={active ? '$background' : 'transparent'}
        hoverStyle={{
          bg: active ? '$background' : '$color3',
        }}
        role="tab"
        aria-selected={active}
      >
        <SizableText
          size="$3"
          fow={active ? '700' : '500'}
          color={active ? '$color12' : '$color10'}
        >
          {label}
        </SizableText>
      </XStack>
    </Link>
  )
}

export const TopNav = () => {
  const scrollParentRef = useRef<any>(null)
  const { onOpen } = useContext(SearchContext)
  const pathname = usePathname()
  const isBlog = pathname.startsWith('/blog')

  return (
    <>
      <HeaderMenu />

      <XStack
        ref={scrollParentRef}
        pos="relative"
        jc="space-between"
        ai="center"
        maw={isBlog ? 1100 : 1400}
        w="100%"
        zi={90_000}
        pe="none"
        mx="auto"
        $md={{
          px: '$5',
          py: '$3',
          y: 20,
        }}
        $gtMd={{
          jc: isBlog ? 'space-between' : 'flex-end',
          t: 26,
          px: 25,
        }}
      >
        {/* Logo - only show on mobile for most pages, always show on blog */}
        <XStack
          gap="$3"
          left="$0"
          ai="center"
          pe="auto"
          $gtMd={{
            display: isBlog ? 'flex' : 'none',
          }}
        >
          <Link href="/">
            <View
              group
              containerType="normal"
              pos="relative"
              mx="auto"
              pointerEvents="none"
              y={-2}
            >
              <OneLogo size={0.5} animate minimal />
            </View>
          </Link>
        </XStack>

        <XStack
          pos="relative"
          pe="none"
          ai="center"
          jc="flex-end"
          gap="$1"
          f={1}
          fb="auto"
          fd="row"
        >
          <XStack
            pos="relative"
            group="card"
            containerType="normal"
            ai="center"
            jc="flex-end"
            fg={10}
            $sm={{ dsp: 'none' }}
          >
            <View
              transition="quickest"
              mt={2}
              pe="auto"
              hoverStyle={{
                y: -1,
              }}
              pressStyle={{
                y: 2,
              }}
            >
              <ReleaseStatus />
            </View>

            <XStack pe="auto" y={-2} mx="$4">
              <Separator vertical />
              <SocialLinksRow />
              <Separator vertical />
            </XStack>
          </XStack>

          <XStack pe="none" ai="center">
            <DocsNativeTabs />

            <SimpleButton marginTop={-3} mr={8} onPress={onOpen}>
              <Search width={24} height={24} color="$color12" strokeWidth={2} />
            </SimpleButton>

            <ToggleThemeButton />

            {!isBlog && <YStack w={50} />}
          </XStack>
        </XStack>
      </XStack>
    </>
  )
}
