// `@tamagui/remove-scroll` is not using `react-remove-scroll` and exporting `classNames` anymore
// import { classNames } from '@tamagui/remove-scroll'
import { type Frontmatter } from '@vxrn/mdx-rust'
import type { LinkProps } from 'one'
import { Circle, H4, Paragraph, Separator, XStack, YStack } from 'tamagui'
import { ScrollView } from '../site/ScrollView'

const QuickNavLink = ({ href, ...rest }: LinkProps) => (
  <a onClick={(e) => [e.stopPropagation()]} href={href as any}>
    <Paragraph
      render="span"
      size="3"
      color="color11 hover:color12"
      cursor="pointer"
      paddingVertical="0-5"
      {...(rest as any)}
    />
  </a>
)

export function DocsRightSidebar({
  headings = [],
}: {
  headings: Frontmatter['headings']
}) {
  return (
    <YStack
      render="aside"
      display="none gtMd:flex"
      pointerEvents="gtMd:none"
      flexShrink="gtMd:0"
      zIndex="gtMd:1"
      position="gtMd:fixed"
      top="gtMd:130px"
      bottom="gtMd:0px"
      width="gtMd:200px gtLg:200px"
      right="gtMd:0px gtLg:auto"
      left="gtLg:50%"
      marginLeft="gtLg:410px"
      paddingRight="gtMd:5 gtLg:0px"
    >
      <YStack
        render="nav"
        aria-labelledby="site-quick-nav-heading"
        display={headings.length === 0 ? 'none' : 'flex'}
        gap="2"
        flex={1}
        overflow="hidden"
        pointerEvents="auto"
      >
        <H4 userSelect="none" size="2" marginHorizontal="2" id="site-quick-nav-heading">
          Quick nav
        </H4>

        <Separator />

        <YStack flex={1} overflow="hidden">
          <ScrollView style={{ flex: 1 }}>
            <YStack paddingHorizontal="2" paddingBottom="10">
              <ul style={{ margin: 0, padding: 0 }}>
                {headings.map(({ id, title, priority }, i) => {
                  return (
                    <XStack key={i} render="li" alignItems="center" paddingVertical="1">
                      {priority > 2 && <Circle size={4} marginHorizontal="2" />}
                      <QuickNavLink href={`#${id}` as any}>{title}</QuickNavLink>
                    </XStack>
                  )
                })}
              </ul>
            </YStack>
          </ScrollView>
        </YStack>
      </YStack>
    </YStack>
  )
}
