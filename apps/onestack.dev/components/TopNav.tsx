import { Search } from '@tamagui/lucide-icons'
import { useContext, useRef } from 'react'
import { Separator, styled, View, XStack, YStack } from 'tamagui'
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

export const TopNav = () => {
  const scrollParentRef = useRef<HTMLDivElement>(null)
  const { onOpen } = useContext(SearchContext)
  const pathname = usePathname()
  const isBlog = pathname.startsWith('/blog')

  return (
    <>
      <HeaderMenu />

      <XStack
        ref={scrollParentRef}
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
          top: 26,
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

        <XStack pe="none" ai="center" jc="center" gap="$1" f={1}>
          <XStack
            group="card"
            containerType="normal"
            ai="center"
            jc="flex-end"
            $sm={{ dsp: 'none' }}
            f={10}
          >
            <View
              animation="quickest"
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

          <XStack pe="none" ai="center" jc="flex-end" f={10} $gtSm={{ f: 0 }}>
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
