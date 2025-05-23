import { useState } from 'react'
import type { TabLayout, TabsTabProps, ViewProps } from 'tamagui'
import { Avatar, SizableText, XStack, styled } from 'tamagui'
import { AnimatePresence, Tabs, YStack } from 'tamagui'
import { Logo } from '../brand/Logo'

export function RovingTabs({
  tabs,
  children,
  initialTab,
}: { tabs: { label: any; value: string }[]; children: any; initialTab: string }) {
  const [selected, setSelected] = useState<string>(initialTab)

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

  // 1 = right, 0 = nowhere, -1 = left
  const direction = (() => {
    if (!activeAt || !prevActiveAt || activeAt.x === prevActiveAt.x) {
      return 0
    }
    return activeAt.x > prevActiveAt.x ? -1 : 1
  })()

  const handleOnInteraction: TabsTabProps['onInteraction'] = (type, layout) => {
    if (type === 'select') {
      setActiveIndicator(layout)
    } else {
      setIntentIndicator(layout)
    }
  }

  return (
    <Tabs
      activationMode="manual"
      orientation="horizontal"
      size="$4"
      br="$4"
      value={selected}
      onPress={(e) => e.stopPropagation()}
      onValueChange={setSelected}
      group
      mt={1}
      f={1}
    >
      <YStack data-tauri-drag-region w="100%">
        <YStack data-tauri-drag-region p="$1.5" m="$2" mb={0} br="$5">
          <XStack data-tauri-drag-region w="100%" gap="$6">
            <XStack w={45} />

            <XStack f={1}>
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
                    theme="alt1"
                    w={activeAt.width}
                    h={activeAt.height}
                    x={activeAt.x}
                    y={activeAt.y}
                  />
                )}
              </AnimatePresence>

              <Tabs.List
                f={1}
                disablePassBorderRadius
                loop={false}
                aria-label="package manager"
                gap="$2"
                data-tauri-drag-region
              >
                {tabs.map((tab) => {
                  return (
                    <Tab
                      key={tab.value}
                      active={selected === tab.value}
                      label={tab.label}
                      onInteraction={handleOnInteraction}
                      value={tab.value}
                    />
                  )
                })}
              </Tabs.List>
            </XStack>

            <Logo y={-3} size={0.75} />
          </XStack>
        </YStack>

        <AnimatePresence exitBeforeEnter custom={{ direction }} initial={false}>
          <AnimatedYStack f={1} data-tauri-drag-region key={selected}>
            {children}
          </AnimatedYStack>
        </AnimatePresence>
      </YStack>
    </Tabs>
  )
}

function Tab({
  label,
  value,
  onInteraction,
  active,
}: {
  label: string
  value: string
  onInteraction: TabsTabProps['onInteraction']
  active?: boolean
}) {
  return (
    <Tabs.Tab
      unstyled
      pl="$2"
      pr="$2.5"
      py="$1.5"
      gap="$1.5"
      f={1}
      // bg="$color1"
      bw={0}
      bc="$color1"
      shadowRadius={0}
      value={value}
      data-tauri-drag-region
      onInteraction={onInteraction}
    >
      <XStack data-tauri-drag-region gap="$1.5" ai="center" jc="center">
        <SizableText fontFamily="$mono" data-tauri-drag-region y={-0.5} size="$2">
          {label}
        </SizableText>
      </XStack>
    </Tabs.Tab>
  )
}

function TabIndicator({ active, ...props }: { active?: boolean } & ViewProps) {
  return (
    <YStack
      pos="absolute"
      bg="$color8"
      br="$4"
      animation="quickest"
      enterStyle={{
        o: 0,
      }}
      exitStyle={{
        o: 0,
      }}
      {...(active && {
        bg: '$color10',
      })}
      {...props}
    />
  )
}

const AnimatedYStack = styled(YStack, {
  f: 1,
  x: 0,
  o: 1,

  animation: '100ms',
  variants: {
    // 1 = right, 0 = nowhere, -1 = left
    direction: {
      ':number': (direction) => ({
        enterStyle: {
          x: direction > 0 ? -10 : -10,
          opacity: 0,
        },
        exitStyle: {
          zIndex: 0,
          x: direction < 0 ? -10 : -10,
          opacity: 0,
        },
      }),
    },
  } as const,
})
