import { useState } from 'react'
import type { TabLayout, TabsTabProps, ViewProps } from 'tamagui'
import {
  AnimatePresence,
  SizableText,
  Tabs as TamaguiTabs,
  XStack,
  YStack,
  styled,
  withStaticProperties,
} from 'tamagui'

function TabsComponent({
  tabs,
  children,
  initialTab,
  onValueChange,
  ...rest
}: {
  tabs: { label: any; value: string }[]
  children: any
  initialTab: string
  onValueChange?: (value: string) => void
}) {
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
    <TamaguiTabs
      activationMode="manual"
      orientation="horizontal"
      size="$4"
      width="100%"
      rounded="$4"
      value={selected}
      onPress={(e) => e.stopPropagation()}
      onValueChange={(val) => {
        onValueChange?.(val)
        setSelected(val)
      }}
      group
      flex={1}
      {...rest}
    >
      <YStack width="100%">
        <YStack rounded="$5">
          <XStack width="100%" gap="$6">
            <XStack mb="$4" flex={1}>
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

              <TamaguiTabs.List
                flex={1}
                disablePassBorderRadius
                loop={false}
                aria-label="package manager"
                gap="$2"
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
              </TamaguiTabs.List>
            </XStack>
          </XStack>
        </YStack>

        {/* <AnimatePresence exitBeforeEnter custom={{ direction }} initial={false}>
          <AnimatedYStack flex={1} key={selected}>
            
          </AnimatedYStack>
        </AnimatePresence> */}

        {children}
      </YStack>
    </TamaguiTabs>
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
    <TamaguiTabs.Tab
      unstyled
      pl="$2"
      pr="$2.5"
      py="$1.5"
      gap="$1.5"
      flex={1}
      bg="transparent"
      borderWidth={0}
      borderColor="$color1"
      shadowRadius={0}
      value={value}
      onInteraction={onInteraction}
    >
      <XStack gap="$1.5" items="center" justify="center">
        <SizableText y={-0.5} size="$4" fontWeight="500">
          {label}
        </SizableText>
      </XStack>
    </TamaguiTabs.Tab>
  )
}

function TabIndicator({ active, ...props }: { active?: boolean } & ViewProps) {
  return (
    <YStack
      position="absolute"
      bg="$color5"
      opacity={0.7}
      rounded="$4"
      animation="quickestLessBouncy"
      enterStyle={{
        opacity: 0,
      }}
      exitStyle={{
        opacity: 0,
      }}
      {...(active && {
        bg: '$color8',
        opacity: 0.6,
      })}
      {...props}
    />
  )
}

const AnimatedYStack = styled(YStack, {
  flex: 1,
  x: 0,
  opacity: 1,

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

export const Tabs = withStaticProperties(TabsComponent, {
  Content: TamaguiTabs.Content,
})
