import type { ReactNode } from 'react'
import {
  createStyledContext,
  isTouchable,
  ScrollView,
  SizableText,
  styled,
  View,
  type ViewProps,
  XStack,
  YStack,
} from 'tamagui'
import { type Href, Link, Slot, usePathname } from 'one'
import { Logo } from '../brand/Logo'
import { useToggleTheme } from '../theme/ToggleThemeButton'
import { HomeIcons } from './HomeIcons'

const Context = createStyledContext({
  isVertical: false,
})

export function HomeLayout() {
  return (
    <Context.Provider isVertical={isTouchable}>
      {isTouchable ? <HomeLayoutTouch /> : <HomeLayoutMouse />}
    </Context.Provider>
  )
}

function HomeLayoutTouch() {
  return (
    <YStack flex={1}>
      <XStack
        items="center"
        justify="space-between"
        py="$1"
        px="$4"
        borderColor="$borderColor"
        borderBottomWidth={1}
      >
        <Logo />
        <ToggleThemeLink flex={0} />
      </XStack>

      <YStack flex={1}>
        <ScrollView>
          <Slot />
        </ScrollView>
      </YStack>

      <XStack items="center" justify="space-around" btw={1} btc="$borderColor" py="$1" gap="$1">
        <NavLinks />
      </XStack>
    </YStack>
  )
}

function HomeLayoutMouse() {
  return (
    <XStack flex={1} mah="100vh">
      <YStack
        miw={220}
        ai="center"
        brw={1}
        brc="$borderColor"
        px="$2"
        py="$4"
        gap="$1"
        $xs={{
          minW: 'auto',
        }}
      >
        <XStack
          mb="$3"
          $xs={{
            width: '$5',
            height: '$5',
            items: 'center',
            justify: 'center',
          }}
        >
          <Logo />
        </XStack>

        <NavLinks />

        <View flex={1} />

        <ToggleThemeLink />
      </YStack>

      <YStack flex={1}>
        <ScrollView>
          <Slot />
        </ScrollView>
      </YStack>
    </XStack>
  )
}

function NavLinks() {
  return (
    <>
      <SideMenuLink href="/" subPaths={['/post/']} Icon={HomeIcons.Home}>
        Feed
      </SideMenuLink>

      <SideMenuLink href="/notifications" Icon={HomeIcons.Notifications}>
        Notifications
      </SideMenuLink>

      <SideMenuLink href="/profile" Icon={HomeIcons.User}>
        Profile
      </SideMenuLink>
    </>
  )
}

const IconFrame = styled(View, {
  $sm: {
    scale: 0.8,
    m: -5,
  },
})

const ToggleThemeLink = (props: ViewProps) => {
  const { onPress, Icon, setting } = useToggleTheme()
  return (
    <LinkContainer {...props} onPress={onPress}>
      <IconFrame>
        <Icon size={28} />
      </IconFrame>
      <LinkText>
        {setting[0].toUpperCase()}
        {setting.slice(1)}
      </LinkText>
    </LinkContainer>
  )
}

const SideMenuLink = ({
  href,
  subPaths,
  Icon,
  children,
}: {
  subPaths?: string[]
  href: Href
  Icon: (typeof HomeIcons)['Home']
  children: ReactNode
}) => {
  const pathname = usePathname()
  const isActive = pathname === href || subPaths?.some((p) => pathname.startsWith(p))

  return (
    <Link asChild href={href}>
      <LinkContainer isActive={isActive}>
        <IconFrame>
          <Icon size={28} />
        </IconFrame>
        <LinkText>{children}</LinkText>
      </LinkContainer>
    </Link>
  )
}

const LinkText = styled(SizableText, {
  context: Context,
  userSelect: 'none',
  dsp: 'flex',
  f: 10,
  size: '$5',
  cur: 'pointer',
  $xs: {
    display: 'none',
  },

  variants: {
    isVertical: {
      true: {},
    },
  } as const,
})

const LinkContainer = styled(XStack, {
  context: Context,
  tag: 'a',
  className: 'text-decoration-none',
  gap: '$4',
  borderRadius: '$6',
  cursor: 'pointer',
  items: 'center',

  hoverStyle: {
    bg: '$color3',
  },

  pressStyle: {
    bg: '$color3',
  },

  variants: {
    isActive: {
      true: {
        backgroundColor: '$color2',
      },
    },

    isVertical: {
      true: {
        flex: 1,
        justify: 'center',
        px: '$2',
        py: '$2.5',
      },
      false: {
        width: '100%',
        px: '$4',
        py: '$2.5',

        $xs: {
          p: 0,
          width: '$6',
          height: '$6',
          items: 'center',
          justify: 'center',
        },
      },
    },
  } as const,
})
