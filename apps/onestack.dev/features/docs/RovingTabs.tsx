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
      padding="4"
      backgroundColor="transparent"
      fontSize={15}
      lineHeight="25px"
      color="color12"
      {...rest}
      flex={1}
      className={className}
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
          borderRadius="4"
          marginHorizontal="1"
          group
          value={selectedPackageManager}
          onPress={(e) => e.stopPropagation()}
          onValueChange={setPackageManager}
        >
          <YStack width="100%">
            <YStack position="relative" paddingHorizontal="1-5" paddingTop="2">
              <AnimatePresence initial={false}>
                {intentAt && (
                  <TabIndicator
                    width={intentAt.width}
                    height={intentAt.height}
                    x={intentAt.x}
                    y={intentAt.y}
                  />
                )}
              </AnimatePresence>

              <AnimatePresence initial={false}>
                {activeAt && (
                  <TabIndicator
                    width={activeAt.width}
                    height={activeAt.height}
                    x={activeAt.x}
                    y={activeAt.y}
                  />
                )}
              </AnimatePresence>

              <Tabs.List loop={false} aria-label="package manager" gap="2">
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
      paddingHorizontal="2-5"
      paddingVertical="2"
      gap="1-5"
      backgroundColor="transparent"
      shadowRadius={0}
      cursor="pointer"
      outlineColor="focus-visible:outlineColor"
      outlineWidth="focus-visible:2px"
      outlineStyle="focus-visible:solid"
      borderWidth={0}
      borderRadius="4"
      value={pkgManager}
      onInteraction={onInteraction}
    >
      <XStack gap="1-5" alignItems="center" justifyContent="center">
        <Image
          scale={imageName === 'pnpm' ? 0.7 : 0.8}
          src={`/logos/${imageName}.svg`}
          width={16}
          height={16}
          alt={pkgManager}
        />
        <SizableText
          y={-0.5}
          size="3"
          cursor="pointer"
          color={`${active ? 'color12' : 'color11'}`}
          opacity={active ? 1 : 0.75}
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
      top={0}
      left={0}
      backgroundColor="color1"
      transition="quickest"
      opacity="0.7 enter:0 exit:0"
      {...(active && {
        backgroundColor: 'color8',
        opacity: 0.6,
      })}
      {...props}
      borderRadius="4"
      zIndex={0}
    />
  )
}
