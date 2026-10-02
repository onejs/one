import * as React from 'react'
import { Accordion, Paragraph, Square, XStack, YStack } from 'tamagui'
import { Link } from 'one'
import { DocsRouteNavItem } from './DocsRouteNavItem'
import { docsRoutes } from './docsRoutes'
import { nativeRoutes } from './nativeRoutes'
import { useDocsMenu } from './useDocsMenu'
import { ChevronDown } from '~/features/icons/lucide'

type Routes = typeof docsRoutes

const getAllItems = (routes: Routes) =>
  routes.flatMap((section, sectionIndex) =>
    section.pages?.map((page, index) => ({ page, section, sectionIndex, index }))
  )

type Item = ReturnType<typeof getAllItems>[number]
type Section = NonNullable<Item>['section']

export const DocsMenuContents = React.memo(function DocsMenuContents({
  inMenu,
}: {
  inMenu?: boolean
}) {
  const { currentPath } = useDocsMenu()
  const routes = currentPath.startsWith('/native') ? nativeRoutes : docsRoutes
  const allItems = React.useMemo(() => getAllItems(routes), [routes])
  const itemsGrouped: Record<string, Item[]> = {}
  for (const item of allItems) {
    const key = item.section.title || ''
    itemsGrouped[key] ||= []
    itemsGrouped[key].push(item)
  }

  return (
    <>
      <div style={{ width: '100%' }}>
        {/* Blog link hidden for now - pages still accessible at /blog */}
        {/* every section starts expanded; each still collapses on its own */}
        <Accordion
          key={currentPath.startsWith('/native') ? 'native' : 'docs'}
          type="multiple"
          defaultValue={Object.keys(itemsGrouped).filter(Boolean)}
        >
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
}: {
  section: Section
  items: Item[]
  inMenu?: boolean
}) => {
  const { currentPath } = useDocsMenu()

  const content = (
    <YStack px="2" py="3" mb="3">
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
      <YStack bbw={0} borderColor={`${inMenu ? 'transparent' : 'background02'}`}>
        {children}
      </YStack>
    )
  }

  if (!section.title) {
    return wrapper(<YStack mb="-2">{content}</YStack>)
  }

  return wrapper(
    <Accordion.Item bw={0} value={section.title || 'base'}>
      <Accordion.Trigger padding="1px 6px" bg="transparent hover:background02" bw={0}>
        {({ open }) => {
          return (
            <XStack
              flexDirection="row"
              py="2"
              px="4"
              w="100%"
              justifyContent="space-between"
              render="span"
              alignItems="center"
            >
              <Paragraph size="5" color="color12" fontWeight="600">
                {section.title}
              </Paragraph>

              <Square transition="quick" rotate={open ? '180deg' : '0deg'}>
                <ChevronDown color="color7" size={20} />
              </Square>
            </XStack>
          )
        }}
      </Accordion.Trigger>

      <Accordion.HeightAnimator overflow="hidden" transition="quickest">
        <Accordion.Content p={0} transition="quickest" bg="transparent" opacity="exit:0">
          {content}
        </Accordion.Content>
      </Accordion.HeightAnimator>
    </Accordion.Item>
  )
}
