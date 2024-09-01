import type { ReactNode } from 'react'
import { SizableText, styled, View, XStack, YStack } from 'tamagui'
import { Link, Slot } from 'vxs'
import { Logo } from '../brand/Logo'
import { HomeIcons } from './HomeIcons'
import { ToggleThemeButton, useToggleTheme } from '../theme/ToggleThemeButton'

export function HomeLayout() {
  return (
    <XStack f={1}>
      <YStack
        miw={220}
        ai="center"
        brw={1}
        brc="$borderColor"
        px="$2"
        py="$4"
        gap="$1"
        $xs={{
          miw: 'auto',
        }}
      >
        <XStack
          mb="$3"
          $xs={{
            w: '$5',
            h: '$5',
            ai: 'center',
            jc: 'center',
          }}
        >
          <Logo />
        </XStack>

        <SideMenuLink href="(feed)" Icon={HomeIcons.Home}>
          Feed
        </SideMenuLink>

        <SideMenuLink href="/notifications" Icon={HomeIcons.Notifications}>
          Notifications
        </SideMenuLink>

        <SideMenuLink href="/profile" Icon={HomeIcons.User}>
          Profile
        </SideMenuLink>

        <View flex={1} />

        <ToggleThemeLink />
      </YStack>

      <YStack f={1}>
        <Slot />
      </YStack>
    </XStack>
  )
}

const iconProps = {
  size: 20,
  $xs: {
    width: 28,
    height: 28,
  },
}

const ToggleThemeLink = () => {
  const { onPress, Icon, setting } = useToggleTheme()
  return (
    <LinkContainer onPress={onPress}>
      <Icon {...iconProps} />
      <LinkText>
        {setting[0].toUpperCase()}
        {setting.slice(1)}
      </LinkText>
    </LinkContainer>
  )
}

const SideMenuLink = ({
  href,
  Icon,
  children,
}: { href: string; Icon: (typeof HomeIcons)['Home']; children: ReactNode }) => {
  return (
    <Link asChild href={href}>
      <LinkContainer>
        <Icon {...iconProps} />
        <LinkText>{children}</LinkText>
      </LinkContainer>
    </Link>
  )
}

const LinkText = styled(SizableText, {
  dsp: 'flex',
  f: 10,
  size: '$5',
  cur: 'pointer',
  $xs: {
    display: 'none',
  },
})

const LinkContainer = styled(XStack, {
  w: '100%',
  className: 'text-decoration-none',
  gap: '$4',
  br: '$6',
  cur: 'pointer',
  ai: 'center',
  px: '$4',
  py: '$2.5',
  hoverStyle: {
    bg: '$color3',
  },
  pressStyle: {
    bg: '$color3',
  },
  $xs: {
    p: 0,
    w: '$6',
    h: '$6',
    ai: 'center',
    jc: 'center',
  },
})
