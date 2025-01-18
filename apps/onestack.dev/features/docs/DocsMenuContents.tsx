import * as React from 'react'
import { Accordion, Paragraph, Square, XStack, YStack } from 'tamagui'
import { DocsRouteNavItem } from './DocsRouteNavItem'
import { docsRoutes } from './docsRoutes'
import { useDocsMenu } from './useDocsMenu'
import { ChevronDown } from '@tamagui/lucide-icons'

const allItems = docsRoutes.flatMap((section, sectionIndex) =>
  section.pages?.map((page, index) => ({ page, section, sectionIndex, index }))
)

type Item = (typeof allItems)[0]
type Section = Item['section']

export const DocsMenuContents = React.memo(function DocsMenuContents({
  inMenu,
}: { inMenu?: boolean }) {
  const activeItems = allItems
  const [items, setItems] = React.useState(activeItems)

  const itemsGrouped: Record<string, Item[]> = {}
  for (const item of items) {
    const key = item.section.title || ''
    itemsGrouped[key] ||= []
    itemsGrouped[key].push(item)
  }

  return (
    <>
      <div style={{ width: '100%' }}>
        <Accordion defaultValue="base" type="single" collapsible>
          {Object.keys(itemsGrouped).map((sectionTitle) => {
            const items = itemsGrouped[sectionTitle]
            return (
              <SubSection
                key={sectionTitle}
                inMenu={inMenu}
                section={items?.[0].section}
                items={items}
              />
            )
          })}
        </Accordion>
      </div>
    </>
  )
})

const SubSection = ({
  section,
  items,
  inMenu,
}: { section: Section; items: Item[]; inMenu?: boolean }) => {
  const { currentPath } = useDocsMenu()
  const [visible, setVisible] = React.useState(!section.title)

  const content = (
    <YStack px="$2" py="$3" mb="$3">
      {items.map(({ page }, index) => {
        return (
          <DocsRouteNavItem
            inMenu={inMenu}
            href={page.route}
            active={currentPath === page.route}
            pending={page['pending']}
            key={`${page.route}${index}`}
            index={index}
          >
            {page.title}
          </DocsRouteNavItem>
        )
      })}
    </YStack>
  )

  const wrapper = (children) => {
    return (
      <YStack bbw={0.5} bc={inMenu ? 'transparent' : '$background025'}>
        {children}
      </YStack>
    )
  }

  if (!section.title) {
    return wrapper(<YStack mb="$1">{content}</YStack>)
  }

  return wrapper(
    <Accordion.Item value={section.title || 'base'}>
      <Accordion.Trigger
        unstyled
        bg="transparent"
        bw={0}
        hoverStyle={{
          bg: '$background025',
        }}
      >
        {({ open }) => {
          return (
            <XStack
              onPress={() => {
                setVisible(!visible)
              }}
              fd={inMenu ? 'row-reverse' : 'row'}
              py="$2"
              px="$4"
              jc="space-between"
              ai="center"
              gap="$3"
            >
              <Paragraph size="$5" fow="600" color="$color12">
                {section.title}
              </Paragraph>

              <Square animation="quick" rotate={open ? '180deg' : '0deg'}>
                <ChevronDown color="$color7" size="$1" />
              </Square>
            </XStack>
          )
        }}
      </Accordion.Trigger>

      <Accordion.HeightAnimator overflow="hidden" animation="quickest">
        <Accordion.Content
          unstyled
          animation="quickest"
          bg="transparent"
          exitStyle={{ opacity: 0 }}
        >
          {content}
        </Accordion.Content>
      </Accordion.HeightAnimator>
    </Accordion.Item>
  )
}
