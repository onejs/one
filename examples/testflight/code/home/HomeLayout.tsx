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
        alignItems="center"
        justifyContent="space-between"
        paddingVertical="1"
        paddingHorizontal="4"
        borderBottomColor="borderColor"
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

      <XStack
        alignItems="center"
        justifyContent="space-around"
        borderTopWidth={1}
        borderTopColor="borderColor"
        paddingVertical="1"
        gap="1"
      >
        <NavLinks />
      </XStack>
    </YStack>
  )
}

function HomeLayoutMouse() {
  return (
    <XStack flex={1} maxHeight="100vh">
      <YStack
        minWidth="220px xs:auto"
        alignItems="center"
        borderRightWidth={1}
        borderRightColor="borderColor"
        paddingHorizontal="2"
        paddingVertical="4"
        gap="1"
      >
        <XStack
          marginBottom="3"
          width="xs:5"
          height="xs:5"
          alignItems="xs:center"
          justifyContent="xs:center"
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
  scale: 'gtXs:0.8',
  margin: 'gtXs:-5px',
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
  size: '5',
  display: 'flex xs:none',
  flex: 10,
  cursor: 'pointer',
  variants: {
    isVertical: {
      true: {},
    },
  } as const,
})

const LinkContainer = styled(XStack, {
  context: Context,
  render: 'a',
  className: 'text-decoration-none',
  gap: '4',
  backgroundColor: 'hover:color3 press:color3',
  borderRadius: '6',
  cursor: 'pointer',
  alignItems: 'center',
  variants: {
    isActive: {
      true: {
        backgroundColor: 'color2',
      },
    },

    isVertical: {
      true: {
        flex: 1,
        justifyContent: 'center',
        paddingHorizontal: '2',
        paddingVertical: '2-5',
      },
      false: {
        width: '100% xs:6',
        paddingHorizontal: '4',
        paddingVertical: '2-5',
        padding: 'xs:0px',
        height: 'xs:6',
        alignItems: 'xs:center',
        justifyContent: 'xs:center',
      },
    },
  } as const,
})
