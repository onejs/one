import { Link, usePathname } from 'one'
import { SizableText, XStack } from 'tamagui'

// switches between the framework docs and the native docs, like the core and
// ui tabs on tamagui.dev. the header shows it on wide screens, the menu on small.
export const DocsSectionTabs = () => {
  const pathname = usePathname()
  const isNative = pathname.startsWith('/native')

  return (
    <XStack
      ai="center"
      gap="$1"
      p="$1"
      br="$10"
      bg="$color2"
      role="tablist"
      aria-label="Documentation section"
    >
      <Tab href="/docs/introduction" active={!isNative} label="Docs" />
      <Tab href="/native" active={isNative} label="Native" />
    </XStack>
  )
}

const Tab = ({
  href,
  active,
  label,
}: {
  href: '/docs/introduction' | '/native'
  active: boolean
  label: string
}) => {
  return (
    <Link href={href} asChild>
      <XStack
        render="a"
        ai="center"
        jc="center"
        px="$3"
        py="$1.5"
        br="$8"
        cursor="pointer"
        bg={active ? '$background' : 'transparent'}
        hoverStyle={{ bg: active ? '$background' : '$color3' }}
        pressStyle={{ bg: active ? '$background' : '$color4' }}
        role="tab"
        aria-selected={active}
      >
        <SizableText
          size="$3"
          fow={active ? '700' : '500'}
          color={active ? '$color12' : '$color10'}
        >
          {label}
        </SizableText>
      </XStack>
    </Link>
  )
}
