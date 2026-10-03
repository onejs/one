/**
 * @agent-rule
 * desktop navigation chrome. it renders features/app/tabs.ts APP_TABS
 * as-is; add or rename tabs there, never here.
 */
import { usePathname } from 'one'
import { SizableText, XStack } from 'tamagui'
import { Link } from '~/interface/app/Link'
import { APP_TABS } from './tabs'

export function NavigationTabs() {
  const pathname = usePathname()

  return (
    <XStack items="center" gap="0-5" p="0-5" rounded="6" bg="color-2">
      {APP_TABS.map((tab) => {
        const Icon = tab.icon
        const active = pathname === tab.href || pathname.startsWith(`${tab.href}/`)

        return (
          <Link key={tab.name} href={tab.href} asChild>
            <XStack
              render="a"
              cursor="pointer"
              items="center"
              gap={7}
              px={13}
              py={7}
              rounded="5"
              bg={`${active ? 'background' : 'transparent'}`}
              borderWidth={active ? 1 : 0}
              borderColor="color-4"
            >
              <Icon size={18} color={active ? 'color' : 'color-10'} />
              <SizableText size="3" fontWeight={active ? '800' : '600'}>
                {tab.label}
              </SizableText>
            </XStack>
          </Link>
        )
      })}
    </XStack>
  )
}
