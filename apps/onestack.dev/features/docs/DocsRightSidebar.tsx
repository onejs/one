// `@tamagui/remove-scroll` is not using `react-remove-scroll` and exporting `classNames` anymore
// import { classNames } from '@tamagui/remove-scroll'
import { type Frontmatter } from '@vxrn/mdx'
import type { LinkProps } from 'one'
import { Circle, H4, Paragraph, Separator, XStack, YStack } from 'tamagui'
import { ScrollView } from '../site/ScrollView'

const QuickNavLink = ({ href, ...rest }: LinkProps) => (
  <a onClick={(e) => [e.stopPropagation()]} href={href as any}>
    <Paragraph
      render="span"
      size="$3"
      color="$color11"
      cursor="pointer"
      py="$0.5"
      hoverStyle={{
        color: '$color12',
      }}
      {...rest}
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
      // className={classNames.zeroRight}
      display="none"
      $gtMd={{
        display: 'flex',
        pe: 'none',
        width: 200,
        flexShrink: 0,
        zIndex: 1,
        position: 'fixed' as any,
        right: 0,
        top: 130,
        pr: '$5',
      }}
      $gtLg={{
        width: 200,
        right: 'auto',
        left: '50%',
        marginLeft: 410,
        pr: 0,
      }}
    >
      <YStack
        render="nav"
        aria-labelledby="site-quick-nav-heading"
        display={headings.length === 0 ? 'none' : 'flex'}
        gap="$2"
        pe="auto"
      >
        <H4 userSelect="none" size="$2" mx="$2" id="site-quick-nav-heading">
          Quick nav
        </H4>

        <Separator />

        <YStack maxHeight="calc(100vh - var(--space-25))">
          <ScrollView>
            <YStack px="$2">
              <ul style={{ margin: 0, padding: 0 }}>
                {headings.map(({ id, title, priority }, i) => {
                  return (
                    <XStack key={i} render="li" ai="center" py="$1">
                      {priority > 2 && <Circle size={4} mx="$2" />}
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
