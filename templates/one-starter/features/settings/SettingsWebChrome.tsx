import { usePathname } from 'one'
import { memo } from 'react'
import { ScrollView, SizableText, styled, Switch, View, XStack, YStack } from 'tamagui'
import { APP_NAME_LOWERCASE, DOMAIN } from '~/constants'
import { MainHeader } from '~/features/app/MainHeader'
import { useSettingsData, type SettingItem } from '~/features/settings/useSettingsData'
import { Link } from '~/interface/app/Link'
import { UnreadDot } from '~/interface/app/UnreadDot'
import { PageMainContainer } from '~/interface/layout/PageContainer'
import type { ReactNode } from 'react'

// the web shell around every settings screen: the main header, the sidebar on
// md and up, and the page column. it is a component the screens render rather
// than a settings _layout, because a _layout owns its whole subtree: with one
// in app/home/settings the native stack can only push the subtree as a single
// screen, so edit-profile renders in place with no system back button of its
// own. the native leg has no shell at all; the stack's navigation bar is it.
export function SettingsWebChrome({ children }: { children: ReactNode }) {
  return (
    <>
      <MainHeader />
      <XStack
        flex={1}
        flexBasis="auto"
        pt="calc(50px + var(--safe-area-top))"
        minH="calc(100vh - 50px - var(--safe-area-top))"
      >
        <View
          width={260}
          borderRightWidth={1}
          borderRightColor="color-2"
          position="sticky"
          t="calc(50px + var(--safe-area-top))"
          height="calc(100vh - 50px - var(--safe-area-top))"
          shrink={0}
          display="none md:flex"
        >
          <SettingsSidebarContent />
        </View>
        <YStack flex={1} flexBasis="auto">
          {/* flex chain must carry a definite height down to the screen's
              ScrollView — an auto-height main collapses it to 0 on mobile web */}
          <PageMainContainer flex={1} pt="6" px="2 md:4" maxW="xl:680px">
            {children}
          </PageMainContainer>
        </YStack>
      </XStack>
    </>
  )
}

// one switch shape for both settings surfaces, so a toggle row reads the same
// in the sidebar and on the narrow screen. the frame renders a <button> and
// tamagui resets only its border style, so without borderWidth the browser's
// 2px outset border rings the track and squeezes the thumb.
export const SettingToggle = memo(({ item }: { item: SettingItem }) => (
  <Switch
    bg="color-5"
    borderWidth={0}
    checked={item.toggle?.checked ?? false}
    onCheckedChange={item.toggle?.onCheckedChange}
    activeStyle={{ backgroundColor: 'green-800' }}
    testID={`setting-toggle-${item.id}`}
  >
    <Switch.Thumb bg="white" boxShadow="0 1px 3px shadow-5" />
  </Switch>
))

// one footer used by both settings surfaces: the sidebar passes `compact`,
// the narrow screen uses the default stacked layout.
export const LogoAndVersion = memo(({ compact }: { compact?: boolean }) => {
  if (compact) {
    return (
      <YStack items="center" pt="8" pb={18}>
        <SizableText size="2" color="color-9">
          {APP_NAME_LOWERCASE} v1.0.0
        </SizableText>
      </YStack>
    )
  }
  return (
    <YStack items="center" pb={100} pt={18}>
      <XStack items="center" gap={7}>
        <SizableText color="color-10" fontWeight="bold">
          {APP_NAME_LOWERCASE}
        </SizableText>
      </XStack>
      <SizableText size="1" color="color-10" mt={7}>
        v1.0.0
      </SizableText>
    </YStack>
  )
})

const SettingRow = memo(({ item, isActive }: { item: SettingItem; isActive: boolean }) => {
  const Icon = item.icon

  if (item.toggle) {
    return (
      <SettingRowFrame active={false}>
        {Icon && (
          <View width={22} height={22} items="center" justify="center" opacity={0.7}>
            <Icon size={20} color="color-11" />
          </View>
        )}
        <SizableText size="4" color="color-11" flex={1}>
          {item.title}
        </SizableText>
        <SettingToggle item={item} />
      </SettingRowFrame>
    )
  }

  // link rows render as a real anchor via the wrapping <Link asChild>;
  // press rows stay plain pressables.
  const isLinkRow = !item.onPress && !!item.href && !item.external
  const content = (
    <SettingRowFrame
      active={isActive}
      render={isLinkRow ? 'a' : undefined}
      {...(item.onPress && { onPress: item.onPress })}
    >
      {Icon && (
        <View width={22} height={22} items="center" justify="center" opacity={isActive ? 1 : 0.7}>
          <Icon size={20} color={isActive ? 'color' : 'color-11'} />
        </View>
      )}
      <SizableText
        size="4"
        fontWeight={isActive ? '600' : '400'}
        color={`${isActive ? 'color' : 'color-11'}`}
      >
        {item.title}
      </SizableText>
      {item.showsUnreadDot ? <UnreadDot /> : null}
    </SettingRowFrame>
  )

  if (item.onPress) {
    return content
  }

  if (item.href) {
    if (item.external) {
      return (
        <SettingRowFrame
          active={isActive}
          onPress={() => window.open(`https://${DOMAIN}${item.href}`, '_blank', 'noopener')}
        >
          {Icon && (
            <View width={22} height={22} items="center" justify="center" opacity={0.7}>
              <Icon size={20} color="color-11" />
            </View>
          )}
          <SizableText size="4" color="color-11">
            {item.title}
          </SizableText>
        </SettingRowFrame>
      )
    }

    return (
      <Link href={item.href} asChild>
        {content}
      </Link>
    )
  }

  return null
})

function SettingsSidebarContent() {
  const pathname = usePathname()
  const { sections } = useSettingsData()

  const isItemActive = (item: SettingItem) => {
    if (!item.href || item.external) return false
    return pathname === item.href || pathname.startsWith(`${item.href}/`)
  }

  return (
    <ScrollView showsVerticalScrollIndicator={false}>
      <YStack p={18} gap={18} select="none">
        <SizableText size="7" fontWeight="700" px={13}>
          Settings
        </SizableText>

        {sections.map((section) => (
          <YStack key={section.title} gap="0-5">
            <SectionTitle>{section.title}</SectionTitle>
            {section.items.map((item) => (
              <SettingRow key={item.id} item={item} isActive={isItemActive(item)} />
            ))}
          </YStack>
        ))}

        <LogoAndVersion compact />
      </YStack>
    </ScrollView>
  )
}

const SettingRowFrame = styled(XStack, {
  cursor: 'pointer',
  height: 44,
  px: 13,
  rounded: '3',
  items: 'center',
  gap: 13,
  bg: 'transparent hover:color-3 press:color-4',
  transition: 'quick',
  scale: 'press:0.98',
  variants: {
    active: {
      true: {
        bg: 'color-3',
      },
    },
  } as const,
})

const SectionTitle = styled(SizableText, {
  size: '2',
  fontWeight: '600',
  color: 'color-10',
  textTransform: 'uppercase',
  letterSpacing: 0.5,
  px: 13,
  py: 7,
})
