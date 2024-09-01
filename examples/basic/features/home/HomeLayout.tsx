import type { ReactNode } from 'react'
import { SizableText, XStack, YStack } from 'tamagui'
import { Link, Slot } from 'vxs'
import { HomeIcons } from './HomeIcons'

export function HomeLayout() {
  return (
    <XStack f={1}>
      <YStack brw={1} brc="$borderColor" px="$3" py="$6" gap="$4">
        <SideMenuLink href="(stack)" Icon={HomeIcons.Home}>
          Feed
        </SideMenuLink>

        <SideMenuLink href="/notifications" Icon={HomeIcons.Notifications}>
          Notifications
        </SideMenuLink>

        <SideMenuLink href="/profile" Icon={HomeIcons.User}>
          Profile
        </SideMenuLink>
      </YStack>
      <Slot />
    </XStack>
  )
}

const SideMenuLink = ({
  href,
  Icon,
  children,
}: { href: string; Icon: any; children: ReactNode }) => {
  return (
    <Link href={href}>
      <XStack
        className="text-decoration-none"
        gap="$4"
        br="$10"
        hoverStyle={{
          bg: '$color3',
        }}
        pressStyle={{
          bg: '$color3',
        }}
        $sm={{
          w: '$6',
          h: '$6',
          ai: 'center',
          jc: 'center',
        }}
      >
        <Icon size={24} />
        <SizableText
          size="$6"
          $sm={{
            display: 'none',
          }}
        >
          {children}
        </SizableText>
      </XStack>
    </Link>
  )
}
