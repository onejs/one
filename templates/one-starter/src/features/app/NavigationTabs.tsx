import { Link, usePathname } from 'one'
import { useMedia, XStack, View } from 'tamagui'
import { Pressable } from '~/interface/buttons/Pressable'
import { HouseIcon } from '~/interface/icons/phosphor/HouseIcon'
import { UserCircleIcon } from '~/interface/icons/phosphor/UserCircleIcon'
import type { Href } from 'one'
type TabRoute = {
  name: string
  href: Href
  icon: any
}
const routes: TabRoute[] = [
  {
    name: 'home',
    href: '/home/feed',
    icon: HouseIcon,
  },
  {
    name: 'profile',
    href: '/home/settings',
    icon: UserCircleIcon,
  },
]
export function NavigationTabs() {
  const pathname = usePathname()
  const media = useMedia()
  const iconSize = media.sm ? 24 : 20
  const currentTab =
    routes.find((r) => pathname.startsWith(r.href as string))?.name ?? 'home'
  return (
    <XStack gap="2">
      {routes.map((route) => {
        const Icon = route.icon
        const isActive = currentTab === route.name
        return (
          <Link key={route.name} href={route.href} asChild>
            <Pressable
              px="4"
              py="2"
              rounded="4"
              bg={{
                default: isActive ? 'color-3' : 'transparent',
                hover: 'color-2',
              }}
            >
              <Icon size={iconSize} color={isActive ? 'color' : 'color-10'} />
            </Pressable>
          </Link>
        )
      })}
    </XStack>
  )
}
