import { Search } from '~/features/icons/lucide'
import { useContext, useRef } from 'react'
import { styled, View, XStack, YStack } from 'tamagui'
import { Link, usePathname } from 'one'
import { OneLogo } from '~/features/brand/Logo'
import { DocsSectionTabs } from '~/features/docs/DocsSectionTabs'
import { SearchContext } from '~/features/search/SearchContext'
import { HeaderMenu } from '~/features/site/HeaderMenu'
import { SocialLinksRow } from '~/features/site/SocialLinksRow'
import { ToggleThemeButton } from '~/features/theme/ThemeToggleButton'

const SimpleButton = styled(View, {
  role: 'button',
  cursor: 'pointer',
  w: 42,
  h: 42,
  bg: 'hover:color3 press:color2',
  pos: 'relative',
  pointerEvents: 'auto',
  alignItems: 'center',
  justifyContent: 'center',
  br: '10',
})

export const TopNav = () => {
  const scrollParentRef = useRef<any>(null)
  const { onOpen } = useContext(SearchContext)
  const pathname = usePathname()
  const isBlog = pathname.startsWith('/blog')
  const isDocs = pathname.startsWith('/docs') || pathname.startsWith('/native')

  return (
    <>
      <HeaderMenu />

      <XStack
        ref={scrollParentRef}
        pos="relative"
        justifyContent={`space-between gtMd:${isBlog ? 'space-between' : 'flex-end'}`}
        alignItems="center"
        maw={isBlog ? 1100 : 1400}
        w="100%"
        mx="auto"
        px="md:5 gtMd:25px"
        py="md:3"
        y="md:20px"
        top="gtMd:26px"
        zi={90_000}
        pointerEvents="none"
      >
        {/* Logo - only show on mobile for most pages, always show on blog */}
        <XStack
          gap="3"
          left="0"
          display={`gtMd:${isBlog ? 'flex' : 'none'}`}
          alignItems="center"
          pointerEvents="auto"
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
              <OneLogo size={0.5} animate />
            </View>
          </Link>
        </XStack>

        <XStack
          pos="relative"
          pointerEvents="none"
          alignItems="center"
          justifyContent="flex-end"
          gap="1"
          f={1}
          fb="auto"
          flexDirection="row"
        >
          <XStack
            pos="relative"
            group="card"
            container="card"
            containerType="normal"
            alignItems="center"
            justifyContent="flex-end"
            display="sm:none"
            fg={10}
          >
            <XStack pointerEvents="auto" y={-2} mx="4">
              <SocialLinksRow />
            </XStack>
          </XStack>

          <XStack pointerEvents="none" alignItems="center">
            {isDocs && (
              <View pointerEvents="auto" mr="2" display="sm:none">
                <DocsSectionTabs />
              </View>
            )}

            <SimpleButton marginTop={-3} mr={8} onPress={onOpen}>
              <Search width={24} height={24} color="color12" strokeWidth={2} />
            </SimpleButton>

            <ToggleThemeButton />

            {!isBlog && <YStack w={50} />}
          </XStack>
        </XStack>
      </XStack>
    </>
  )
}
