import { Menu } from '~/features/icons/lucide'
import * as React from 'react'
import {
  Adapt,
  Button,
  Circle,
  Popover,
  Sheet,
  Theme,
  XStack,
  YStack,
  isTouchable,
} from 'tamagui'
import { useDocsMenu } from '~/features/docs/useDocsMenu'
import { OneBall } from '../brand/Logo'
import { DocsMenuContents } from '../docs/DocsMenuContents'
import { DocsSectionTabs } from '../docs/DocsSectionTabs'
import { useIsScrolled } from './useIsScrolled'
import { SocialLinksRow } from './SocialLinksRow'
import { View } from 'tamagui'
import { Link } from 'one'

export const HeaderMenu = React.memo(function HeaderMenu() {
  const { open, setOpen } = useDocsMenu()
  const [state, setState] = React.useState({
    via: undefined as 'hover' | 'press' | undefined,
    viaAt: Date.now(),
  })
  const isPressOpened = state.via === 'press' && open
  const isScrolled = useIsScrolled()

  return (
    <>
      <Popover
        disableRTL
        hoverable={{
          delay: 50,
          restMs: 40,
          move: false,
        }}
        open={open}
        onOpenChange={(next, via) => {
          if (open && state.via === 'press' && via === 'hover') {
            return
          }
          setState({ ...state, via, viaAt: Date.now() })
          setOpen(next)
        }}
        stayInFrame={{ padding: 20 }}
      >
        <Popover.Anchor asChild>
          <YStack
            zi={120_000}
            pointerEvents="auto"
            t={42}
            r={20}
            display={`gtMd:${!isScrolled ? 'none' : 'flex'}`}
            pos={'fixed' as any}
          >
            <Button
              size="sm"
              height={36}
              bg={`${isPressOpened ? 'color5' : 'transparent'} hover:${isPressOpened ? 'color5' : 'transparent'}`}
              px="2"
              br="10"
              bw={2}
              borderColor="transparent"
              onPress={() => {
                if (isTouchable) {
                  setOpen(!open)
                  return
                }
                if (open && state.via === 'hover') {
                  setState({ ...state, via: 'press', viaAt: Date.now() })
                  return
                }
                if (open) {
                  setOpen(false)
                  return
                }
                // hover handles this
              }}
              aria-label="Open the main menu"
            >
              <Circle
                transition="medium"
                opacity={isScrolled ? 0 : 1}
                size={34}
                alignItems="center"
                justifyContent="center"
              >
                <Menu color="color11" size={20} />
              </Circle>

              <YStack
                position="absolute"
                inset={0}
                transition="medium"
                opacity={isScrolled ? 1 : 0}
                x={8}
                y={0}
              >
                <OneBall />
              </YStack>
            </Button>
          </YStack>
        </Popover.Anchor>

        <Adapt platform="touch" when="sm">
          <Sheet
            zIndex={100000000}
            modal
            dismissOnSnapToBottom
            transition={{
              preset: 'bouncy',
              spring: { damping: 25, mass: 1.2, stiffness: 200 },
            }}
          >
            <Sheet.Container theme="yellow">
              <Sheet.Background bg="color5" br={0} />
              <Sheet.ScrollView showsVerticalScrollIndicator={false} zi={1000}>
                <XStack
                  group="card"
                  container="card"
                  containerType="normal"
                  mt="3"
                  mb="-2"
                  px="2"
                >
                  <Link
                    style={{ marginBottom: -6, marginTop: 12, marginLeft: 26 }}
                    href="/"
                  >
                    <OneBall />
                  </Link>
                  <View flex={1} />
                  <SocialLinksRow />
                </XStack>

                <Adapt.Contents />
              </Sheet.ScrollView>
            </Sheet.Container>
            <Sheet.Overlay zIndex={100} bg="background" opacity="1 enter:0 exit:0" />
          </Sheet>
        </Adapt>

        <HeaderMenuContent open={open} />
      </Popover>
    </>
  )
})

const HeaderMenuContent = React.memo(function HeaderMenuContent({
  open,
}: {
  open: boolean
}) {
  return (
    <Popover.Content
      theme="yellow"
      mt={-5}
      bg="color5"
      x="0 enter:-10px exit:10px"
      opacity="1 enter:0 exit:0"
      y={4}
      transition={{
        preset: 'quicker',
        opacity: { preset: 'quicker', spring: { overshootClamping: true } },
        properties: 'transform, opacity',
      }}
      p={0}
      maxHeight="80vh"
      maxWidth={360}
      minWidth={280}
      boxShadow="0 27px 54px rgba(0,0,0,0.2)"
      shadowColor="#000"
      shadowOpacity={0.2}
      zIndex={100000000}
      style={{
        WebkitBackdropFilter: 'blur(20px)',
        backdropFilter: 'blur(20px)',
      }}
      bw={0}
      trapFocus
      br="6"
    >
      <Popover.Arrow bg="color5" size={13} borderWidth={0} opacity={0.84} />

      <Popover.ScrollView
        showsVerticalScrollIndicator={false}
        style={{ flexGrow: 1, flexShrink: 1, flexBasis: '0%', width: '100%' }}
      >
        <YStack aria-label="Home menu contents" w="100%" p="4" alignItems="flex-end">
          <Theme name="gray">
            <DocsSectionTabs />
          </Theme>
          <DocsMenuContents inMenu />
        </YStack>
      </Popover.ScrollView>
    </Popover.Content>
  )
})
