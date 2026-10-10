import { tokens } from '~/config/tokens'
import { Menu } from '~/components/icons'
import * as React from 'react'
import {
  Adapt,
  Button,
  Circle,
  Popover,
  Sheet,
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
            zIndex={120_000}
            pointerEvents="auto"
            position={'fixed' as any}
            top={42}
            right={20}
            display={`gtMd:${!isScrolled ? 'none' : 'flex'}`}
          >
            <Button
              size="3"
              backgroundColor={`${isPressOpened ? 'color5' : 'transparent'} hover:${isPressOpened ? 'color5' : 'transparent'}`}
              paddingHorizontal="2"
              borderRadius="10"
              borderWidth={2}
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
            transition="bouncy"
            transitionConfig={{
              type: 'spring',
              damping: 25,
              mass: 1.2,
              stiffness: 200,
            }}
          >
            <Sheet.Container>
              <Sheet.Background backgroundColor="color5" />
              <Sheet.ScrollView showsVerticalScrollIndicator={false} zIndex={1000}>
                <XStack
                  group="card"
                  container="card"
                  containerType="normal"
                  marginTop="3"
                  marginBottom="-2"
                  paddingHorizontal="2"
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
            <Sheet.Overlay zIndex={100} backgroundColor="background0075" />
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
      marginTop={-5}
      backgroundColor="color5"
      opacity="1 enter:0 exit:0"
      x="0 enter:-10px exit:10px"
      y={4}
      transition={{
        preset: 'quicker',
        opacity: { preset: 'quicker', spring: { overshootClamping: true } },
        properties: 'transform, opacity',
      }}
      padding={0}
      maxHeight="80vh"
      overflowY="auto"
      maxWidth={360}
      minWidth={280}
      shadowRadius={54}
      shadowOffset={{ height: 27, width: 0 }}
      shadowColor="#000"
      shadowOpacity={0.2}
      zIndex={100000000}
      borderWidth={0}
      borderRadius="6"
      style={{
        WebkitBackdropFilter: 'blur(20px)',
        backdropFilter: 'blur(20px)',
      }}
      trapFocus
    >
      <Popover.Arrow
        backgroundColor="color5"
        size={tokens.size[4].val}
        borderWidth={0}
        opacity={0.84}
      />

      <YStack
        aria-label="Home menu contents"
        width="100%"
        padding="4"
        alignItems="flex-end"
      >
        <DocsSectionTabs />
        <DocsMenuContents inMenu />
      </YStack>
    </Popover.Content>
  )
})
