import { useState } from 'react'
import type { TabLayout, TabsTabProps, ViewProps } from 'tamagui'
import {
  AnimatePresence,
  Image,
  ScrollView,
  SizableText,
  Tabs,
  XStack,
  YStack,
} from 'tamagui'
import { Code } from './Code'
import { PACKAGE_MANAGERS, useBashCommand } from './useBashCommand'

export function RovingTabs({ className, children, code, size, ...rest }) {
  const { showTabs, transformedCommand, selectedPackageManager, setPackageManager } =
    useBashCommand(code || children, className)

  const [tabState, setTabState] = useState<{
    // Layout of the Tab user might intend to select (hovering / focusing)
    intentAt: TabLayout | null
    // Layout of the Tab user selected
    activeAt: TabLayout | null
    // Used to get the direction of activation for animating the active indicator
    prevActiveAt: TabLayout | null
  }>({
    intentAt: null,
    activeAt: null,
    prevActiveAt: null,
  })

  const setIntentIndicator = (intentAt: TabLayout | null) =>
    setTabState((prevTabState) => ({ ...prevTabState, intentAt }))
  const setActiveIndicator = (activeAt: TabLayout | null) =>
    setTabState((prevTabState) => ({
      ...prevTabState,
      prevActiveAt: tabState.activeAt,
      activeAt,
    }))

  const { activeAt, intentAt, prevActiveAt } = tabState

  const handleOnInteraction: TabsTabProps['onInteraction'] = (type, layout) => {
    if (type === 'select') {
      setActiveIndicator(layout)
    } else {
      setIntentIndicator(layout)
    }
  }

  const content = (
    <Code
      p="$4"
      backgroundColor="transparent"
      f={1}
      className={className}
      fontSize={15}
      lineHeight={25}
      color="$color12"
      {...rest}
    >
      {showTabs ? transformedCommand : children}
    </Code>
  )

  return (
    <>
      {showTabs ? (
        <Tabs
          activationMode="manual"
          orientation="horizontal"
          br="$4"
          mx="$1"
          value={selectedPackageManager}
          onPress={(e) => e.stopPropagation()}
          onValueChange={setPackageManager}
          group
        >
          <YStack w="100%">
            <YStack pos="relative" px="$1.5" pt="$2">
              <AnimatePresence initial={false}>
                {intentAt && (
                  <TabIndicator
                    w={intentAt.width}
                    h={intentAt.height}
                    x={intentAt.x}
                    y={intentAt.y}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence initial={false}>
                {activeAt && (
                  <TabIndicator
                    w={activeAt.width}
                    h={activeAt.height}
                    x={activeAt.x}
                    y={activeAt.y}
                  />
                )}
              </AnimatePresence>

              <Tabs.List loop={false} aria-label="package manager" gap="$2">
                <>
                  {PACKAGE_MANAGERS.map((pkgManager) => (
                    <Tab
                      key={pkgManager}
                      active={selectedPackageManager === pkgManager}
                      pkgManager={pkgManager}
                      onInteraction={handleOnInteraction}
                    />
                  ))}
                </>
              </Tabs.List>
            </YStack>

            <Tabs.Content value={selectedPackageManager} forceMount>
              <ScrollView
                style={{ width: '100%' }}
                contentContainerStyle={{ minWidth: '100%' }}
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                <YStack minWidth="100%">{content}</YStack>
              </ScrollView>
            </Tabs.Content>
          </YStack>
        </Tabs>
      ) : (
        <ScrollView
          style={{ width: '100%' }}
          contentContainerStyle={{ minWidth: '100%' }}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          <YStack minWidth="100%">{content}</YStack>
        </ScrollView>
      )}
    </>
  )
}

function Tab({
  active,
  pkgManager,
  logo,
  onInteraction,
}: {
  active?: boolean
  pkgManager: string
  logo?: string
  onInteraction: TabsTabProps['onInteraction']
}) {
  const imageName = logo ?? pkgManager
  return (
    <Tabs.Tab
      unstyled
      px="$2.5"
      py="$2"
      gap="$1.5"
      bg="transparent"
      bw={0}
      br="$4"
      shadowRadius={0}
      cursor="pointer"
      value={pkgManager}
      onInteraction={onInteraction}
      focusVisibleStyle={{
        outlineColor: '$outlineColor',
        outlineWidth: 2,
        outlineStyle: 'solid',
      }}
    >
      <XStack gap="$1.5" ai="center" jc="center">
        <Image
          scale={imageName === 'pnpm' ? 0.7 : 0.8}
          src={`/logos/${imageName}.svg`}
          width={16}
          height={16}
          alt={pkgManager}
        />
        <SizableText
          y={-0.5}
          size="$3"
          col={active ? '$color12' : '$color11'}
          o={active ? 1 : 0.75}
          cursor="pointer"
        >
          {pkgManager}
        </SizableText>
      </XStack>
    </Tabs.Tab>
  )
}

function TabIndicator({ active, ...props }: { active?: boolean } & ViewProps) {
  return (
    <YStack
      position="absolute"
      pointerEvents="none"
      t={0}
      l={0}
      bg="$color1"
      o={0.7}
      br="$4"
      zi={0}
      transition="quickest"
      enterStyle={{
        o: 0,
      }}
      exitStyle={{
        o: 0,
      }}
      {...(active && {
        bg: '$color8',
        o: 0.6,
      })}
      {...props}
    />
  )
}
