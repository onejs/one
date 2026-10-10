import { Link, usePathname } from 'one'
import { SizableText, XStack } from 'tamagui'

// switches between the framework docs and the native docs, like the core and
// ui tabs on tamagui.dev. the header shows it on wide screens, the menu on small.
export const DocsSectionTabs = () => {
  const pathname = usePathname()
  const isNative = pathname.startsWith('/native')

  return (
    <XStack
      alignItems="center"
      gap="1"
      padding="1"
      backgroundColor="color2"
      borderRadius="10"
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
        className="text-underline-none"
        alignItems="center"
        justifyContent="center"
        paddingHorizontal="3"
        paddingVertical="1-5"
        cursor="pointer"
        backgroundColor={`${active ? 'background' : 'transparent'} hover:${active ? 'background' : 'color3'} press:${active ? 'background' : 'color4'}`}
        borderRadius="8"
        role="tab"
        aria-selected={active}
      >
        <SizableText
          size="3"
          color={`${active ? 'color12' : 'color10'}`}
          fontWeight={active ? '700' : '500'}
        >
          {label}
        </SizableText>
      </XStack>
    </Link>
  )
}
