import { Search } from '~/components/icons'
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
  width: 42,
  height: 42,
  backgroundColor: 'hover:color3 press:color2',
  position: 'relative',
  pointerEvents: 'auto',
  alignItems: 'center',
  justifyContent: 'center',
  borderRadius: '10',
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
        position="relative"
        justifyContent={`space-between gtMd:${isBlog ? 'space-between' : 'flex-end'}`}
        alignItems="center"
        maxWidth={isBlog ? 1100 : 1400}
        width="100%"
        marginHorizontal="auto"
        paddingHorizontal="md:5 gtMd:25px"
        paddingVertical="md:3"
        y="md:20px"
        top="gtMd:26px"
        zIndex={90_000}
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
              position="relative"
              marginHorizontal="auto"
              pointerEvents="none"
              y={-2}
            >
              <OneLogo size={0.5} animate />
            </View>
          </Link>
        </XStack>

        <XStack
          position="relative"
          pointerEvents="none"
          alignItems="center"
          justifyContent="flex-end"
          gap="1"
          flex={1}
          flexBasis="auto"
          flexDirection="row"
        >
          <XStack
            position="relative"
            group="card"
            container="card"
            containerType="normal"
            display="sm:none"
            alignItems="center"
            justifyContent="flex-end"
            flexGrow={10}
          >
            <XStack pointerEvents="auto" y={-2} marginHorizontal="4">
              <SocialLinksRow />
            </XStack>
          </XStack>

          <XStack pointerEvents="none" alignItems="center">
            {isDocs && (
              <View pointerEvents="auto" marginRight="2" display="sm:none">
                <DocsSectionTabs />
              </View>
            )}

            <SimpleButton marginTop={-3} marginRight={8} onPress={onOpen}>
              <Search width={24} height={24} color="color12" strokeWidth={2} />
            </SimpleButton>

            <ToggleThemeButton />

            {!isBlog && <YStack width={50} />}
          </XStack>
        </XStack>
      </XStack>
    </>
  )
}
