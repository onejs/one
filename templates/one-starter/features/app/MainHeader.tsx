/**
 * @agent-rule
 * header navigation chrome. logo, settings, and embedded NavigationTabs
 * targets should stay in sync with features/app/routes.ts; the action button
 * renders the focused tab's action from tabAction.ts and hides when it has none.
 */
import { Link, usePathname } from 'one'
import { memo, useEffect, useState } from 'react'
import { H3, Separator, Spacer, View, XStack, YStack } from 'tamagui'
import { useSession } from '~/auth/client/authClient'
import { useLogout } from '~/features/auth/useLogout'
import { Logo } from '~/interface/app/Logo'
import { Avatar } from '~/interface/avatars/Avatar'
import { Button } from '~/interface/buttons/Button'
import { Icons } from '~/interface/icons'
import { PageContainer } from '~/interface/layout/PageContainer'
import { ListItem } from '~/interface/lists/ListItem'
import { NavigationTabs } from './NavigationTabs'
import { APP_HOME_HREF, APP_SETTINGS_HREF } from './routes'
import { useFocusedTabAction } from './tabAction'

// the row height only seeds the layout spacer before the header is measured;
// padding, safe-area insets, and container tweaks all land in onLayout.
export const MAIN_HEADER_ROW_HEIGHT = 58

type MeasuredLayoutEvent = {
  nativeEvent: { layout: { x: number; y: number; width: number; height: number } }
}

type MainHeaderProps = {
  onLayout?: (event: MeasuredLayoutEvent) => void
}

export function MainHeader({ onLayout }: MainHeaderProps) {
  const action = useFocusedTabAction()
  const { data: session } = useSession()
  const pathname = usePathname()
  const isOnSettings = pathname.startsWith('/home/settings')
  const [menuOpen, setMenuOpen] = useState(false)
  // the fade under the header shows only once the page or the screen's own
  // scroller has moved, so at rest it never lies over the top of the content
  const [scrolled, setScrolled] = useState(false)
  // the header stays mounted across tabs, so each new screen starts from where
  // the page itself sits rather than the last screen's scroller
  useEffect(() => {
    setScrolled(window.scrollY > 0)
    const onScroll = (event: Event) => {
      const target = event.target
      if (!(target instanceof Element)) return setScrolled(window.scrollY > 0)
      // a sideways carousel says nothing about how far the screen has scrolled
      if (target.scrollTop === 0 && target.scrollLeft > 0) return
      setScrolled(target.scrollTop > 0)
    }
    document.addEventListener('scroll', onScroll, { capture: true, passive: true })
    return () => document.removeEventListener('scroll', onScroll, { capture: true })
  }, [pathname])

  return (
    <>
      <YStack
        position="fixed"
        t={0}
        l={0}
        r={0}
        z={100}
        // the header is the top of the page, not a bar over it: the page's own
        // background with no rule, and a short fade below it so content that
        // scrolls up dissolves into the header instead of meeting an edge.
        bg="background"
        paddingTop="web:var(--safe-area-top)"
        onLayout={onLayout}
      >
        <View
          position="absolute"
          t="100%"
          l={0}
          r={0}
          height={24}
          pointerEvents="none"
          opacity={scrolled ? 1 : 0}
          transition="quick"
          backgroundImage="linear-gradient(to bottom, background, background/0)"
        />
        <PageContainer>
          <XStack height={MAIN_HEADER_ROW_HEIGHT} px={7} items="center" gap={13}>
            <Link href={APP_HOME_HREF} aria-label="Home">
              <Logo />
            </Link>

            <Spacer flex={1} />

            <XStack
              position="absolute"
              t={0}
              r={0}
              b={0}
              l={0}
              pointerEvents="none"
              items="center"
              justify="center"
              display="none md:flex"
            >
              <XStack pointerEvents="auto">
                <NavigationTabs />
              </XStack>
            </XStack>

            <XStack gap={7} items="center" display="none md:flex">
              {action && (
                <Link href={action.href} asChild>
                  <Button
                    render="a"
                    size="sm"
                    accent
                    icon={<action.icon size={16} />}
                    onPress={action.onPress}
                    aria-label={action.label}
                    testID={action.testID}
                  >
                    {action.label}
                  </Button>
                </Link>
              )}
              <Link href={APP_SETTINGS_HREF} asChild>
                <Button
                  render="a"
                  size="sm"
                  circular
                  variant={isOnSettings ? 'quiet' : undefined}
                  disabled={isOnSettings}
                  icon={<Icons.Settings size={18} />}
                  aria-label="Settings"
                />
              </Link>
              <Avatar
                size={34}
                image={session?.user?.image}
                name={session?.user?.name || session?.user?.email || 'User'}
              />
            </XStack>

            <MainHeaderMenuButton onOpen={() => setMenuOpen(true)} />
          </XStack>
        </PageContainer>
      </YStack>
      <MainHeaderMenuOverlay open={menuOpen} onOpenChange={setMenuOpen} />
    </>
  )
}

const MainHeaderMenuButton = memo(({ onOpen }: { onOpen: () => void }) => {
  return (
    // responsive hide lives on a plain View: media styles on pseudo-styled
    // buttons resolve at runtime (no SSR media class), so $md on the Button
    // itself hydration-mismatches and leaves it visible on desktop
    <View display="md:none">
      <Button
        size="md"
        circular
        variant="quiet"
        icon={<Icons.Menu size={22} />}
        aria-label="Menu"
        onPress={onOpen}
      />
    </View>
  )
})

const MainHeaderMenuOverlay = memo(
  ({ open, onOpenChange }: { open: boolean; onOpenChange: (open: boolean) => void }) => {
    const { data: session } = useSession()
    const { logout } = useLogout()

    if (!open) return null

    return (
      <YStack
        position="fixed"
        t={0}
        r={0}
        b={0}
        l={0}
        z={1000}
        bg="shadow-6"
        justify="flex-end"
        display="md:none"
        onPress={() => onOpenChange(false)}
        data-testid="main-header-menu-overlay"
      >
        <YStack
          bg="background"
          borderTopLeftRadius="8"
          borderTopRightRadius="8"
          gap={7}
          onPress={(event) => event.stopPropagation()}
          data-testid="main-header-menu-sheet"
        >
          <XStack
            paddingTop={18}
            paddingRight={18}
            paddingLeft={18}
            pb={13}
            justify="space-between"
            items="center"
          >
            <Logo />
          </XStack>

          <Separator />

          <YStack>
            <Link href={APP_SETTINGS_HREF} asChild>
              <ListItem
                render="a"
                icon={<Icons.Settings size={20} />}
                title="Settings"
                onPress={() => onOpenChange(false)}
              />
            </Link>
            <ListItem
              icon={<Icons.SignOut size={20} />}
              title="Logout"
              onPress={() => {
                onOpenChange(false)
                void logout()
              }}
            />
          </YStack>

          {session?.user ? (
            <XStack
              paddingRight={18}
              paddingBottom={18}
              paddingLeft={18}
              pt={7}
              gap={13}
              items="center"
            >
              <Avatar
                size={42}
                image={session.user.image}
                name={session.user.name || session.user.email || 'User'}
              />
              <YStack flex={1}>
                <H3 size="4">{session.user.name || 'Demo User'}</H3>
              </YStack>
            </XStack>
          ) : null}
        </YStack>
      </YStack>
    )
  },
)
