import { Link, usePathname } from 'one'
import { SizableText, XStack } from 'tamagui'

// Switches between the framework docs and the native docs,
// mirroring the Core/UI tabs on tamagui.dev.
export const DocsSectionTabs = () => {
  const pathname = usePathname()
  const isNative = pathname.startsWith('/native')

  return (
    <XStack
      gap="$1"
      p="$1"
      mb="$3"
      mx="$2"
      br="$4"
      bg="$color2"
      ai="center"
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
  href: string
  active: boolean
  label: string
}) => {
  return (
    <Link href={href as any} asChild>
      <XStack
        render="a"
        f={1}
        ai="center"
        jc="center"
        py="$2"
        br="$3"
        cursor="pointer"
        bg={active ? '$background' : 'transparent'}
        hoverStyle={{
          bg: active ? '$background' : '$color3',
        }}
        pressStyle={{
          bg: active ? '$background' : '$color4',
        }}
        role="tab"
        aria-selected={active}
      >
        <SizableText
          size="$4"
          fow={active ? '700' : '500'}
          color={active ? '$color12' : '$color10'}
        >
          {label}
        </SizableText>
      </XStack>
    </Link>
  )
}
