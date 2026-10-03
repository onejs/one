import { Redirect } from 'one'
import { memo } from 'react'
import { SizableText, styled, useMedia, View, XStack, YStack } from 'tamagui'
import { DOMAIN } from '~/constants'
import { APP_SETTINGS_EDIT_PROFILE_HREF } from '~/features/app/routes'
import {
  LogoAndVersion,
  SettingToggle,
  SettingsWebChrome,
} from '~/features/settings/SettingsWebChrome'
import { useSettingsData, type SettingItem } from '~/features/settings/useSettingsData'
import { Link } from '~/interface/app/Link'
import { UnreadDot } from '~/interface/app/UnreadDot'
import { Icons } from '~/interface/icons'
import { PageScrollView } from '~/interface/layout/PageScrollView'
import { SepHeading } from '~/interface/text/Headings'

// the web leg. wide web redirects to the first settings page beside the
// sidebar; narrow web lists the sections here. native is index.ios.tsx on ios
// and index.android.tsx on android.
const MobileSettingRow = memo(({ item }: { item: SettingItem }) => {
  const Icon = item.icon

  if (item.toggle) {
    return (
      <MobileSettingRowFrame>
        <XStack gap={13} items="center" flex={1}>
          {Icon && (
            <View width={24} items="center" justify="center">
              <Icon size={20} color="color-11" />
            </View>
          )}
          <SizableText size="5">{item.title}</SizableText>
        </XStack>
        <SettingToggle item={item} />
      </MobileSettingRowFrame>
    )
  }

  const isLinkRow = !item.onPress && !!item.href && !item.external
  const content = (
    <MobileSettingRowFrame
      render={isLinkRow ? 'a' : undefined}
      {...(item.onPress && { onPress: item.onPress })}
    >
      <XStack gap={13} items="center" flex={1}>
        {Icon && (
          <View width={24} items="center" justify="center">
            <Icon size={20} color="color-11" />
          </View>
        )}
        <SizableText size="5">{item.title}</SizableText>
        {item.showsUnreadDot ? <UnreadDot /> : null}
      </XStack>
      <Icons.Disclosure size={16} color="color-8" />
    </MobileSettingRowFrame>
  )

  if (item.onPress) return content

  if (!item.href) return null

  if (item.external) {
    return (
      <MobileSettingRowFrame
        onPress={() => window.open(`https://${DOMAIN}${item.href}`, '_blank', 'noopener')}
      >
        <XStack gap={13} items="center" flex={1}>
          {Icon && (
            <View width={24} items="center" justify="center">
              <Icon size={20} color="color-11" />
            </View>
          )}
          <SizableText size="5">{item.title}</SizableText>
        </XStack>
        <Icons.Disclosure size={16} color="color-8" />
      </MobileSettingRowFrame>
    )
  }

  return (
    <Link href={item.href} asChild>
      {content}
    </Link>
  )
})

export default function SettingsPage() {
  const media = useMedia()
  const { sections } = useSettingsData()

  if (media.md) {
    return <Redirect href={APP_SETTINGS_EDIT_PROFILE_HREF} />
  }

  return (
    <SettingsWebChrome>
      <PageScrollView contentPaddingTop={16}>
        <YStack flex={1} flexBasis="auto" pb={60}>
          {sections.map((section) => (
            <YStack key={section.title} mb="8">
              <YStack ml={18}>
                <SepHeading>{section.title}</SepHeading>
              </YStack>
              <YStack>
                {section.items.map((item) => (
                  <MobileSettingRow key={item.id} item={item} />
                ))}
              </YStack>
            </YStack>
          ))}

          <LogoAndVersion />
        </YStack>
      </PageScrollView>
    </SettingsWebChrome>
  )
}

const MobileSettingRowFrame = styled(XStack, {
  cursor: 'pointer',
  height: 56,
  px: 18,
  items: 'center',
  justify: 'space-between',
  bg: 'hover:color-2 press:color-3',
})
