import { ChevronLeft, ChevronRight, Search, Settings2, UserCircle } from '@tamagui/lucide-icons'
import { memo, useEffect, useRef, useState } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { H1, Input, TooltipSimple, XStack, YStack } from 'tamagui'
import { useAuth } from '~/better-auth/authClient'
import { HotMenu } from '~/interface/hotmenu/HotMenu'
import { useCurrentChannel } from '~/state/channel/useCurrentChannel'
import { useCurrentServer } from '~/state/server/useCurrentServer'
import { updateUserState, useUserState } from '~/state/user'
import { isTauri } from '~/tauri/constants'
import { Avatar } from './Avatar'
import { ButtonSimple } from './ButtonSimple'
import { dialogRedirectToTauri, ensureSignedUp } from './dialogs/actions'
import {
  setShouldRedirectBackToTauri,
  shouldRedirectBackToTauri,
  useTauriAuthDeepLink,
} from '~/tauri/authFlowHelpers'
import { XGroup } from 'tamagui'

export const TopBar = memo(() => {
  const { jwtToken } = useAuth()
  const tauriDeepLink = useTauriAuthDeepLink()

  const server = useCurrentServer()
  const channel = useCurrentChannel()
  const [userState] = useUserState()

  useEffect(() => {
    if (shouldRedirectBackToTauri()) {
      // idk why this settimeout fixes it not showing, hook not registered int ime
      // but it seems it should be based on my logs...
      setTimeout(() => {
        setShouldRedirectBackToTauri(false)
        dialogRedirectToTauri()
      })
    }
  }, [jwtToken])

  return (
    <XStack
      data-tauri-drag-region
      br="$4"
      mx={2}
      ai="center"
      jc="space-between"
      y={2}
      h={30}
      pl={72}
      pr={4}
      mb={4}
    >
      <XStack pe="box-none" gap="$3" ai="center">
        <XStack ai="center" gap="$2">
          <TooltipSimple label="Menu">
            <HotMenu />
          </TooltipSimple>

          {isTauri && (
            <XGroup>
              <ButtonSimple scaleIcon={0.9} icon={ChevronLeft}></ButtonSimple>
              <ButtonSimple scaleIcon={0.9} icon={ChevronRight}></ButtonSimple>
            </XGroup>
          )}
        </XStack>

        <H1
          data-tauri-drag-region
          cur="default"
          userSelect="none"
          pe="none"
          m={0}
          o={0.6}
          size="$2"
        >
          {server?.name || '-'} - #{channel?.name || '-'}
        </H1>
      </XStack>

      <XStack ai="center" gap="$1">
        <TopBarSearch />

        <XStack ai="center">
          {!!userState?.showSidePanel && (
            <YStack fullscreen ai="center" jc="center" zi={100}>
              <ButtonSimple
                onPress={() => {
                  updateUserState({
                    showSidePanel: undefined,
                  })
                }}
              >
                <ChevronRight size={20} o={0.5} />
              </ButtonSimple>
            </YStack>
          )}

          <XStack
            ai="center"
            {...(userState?.showSidePanel && {
              opacity: 0,
            })}
          >
            <ButtonSimple
              disabled={!server}
              tooltip="Server settings"
              onPress={() => {
                if (userState?.showSidePanel === 'settings') {
                  updateUserState({
                    showSidePanel: undefined,
                  })
                } else {
                  updateUserState({
                    showSidePanel: 'settings',
                  })
                }
              }}
            >
              <Settings2 o={0.5} size={20} />
            </ButtonSimple>

            <UserButton />
          </XStack>
        </XStack>

        {!isTauri && jwtToken && (
          <a href={tauriDeepLink}>
            <ButtonSimple>Open native app</ButtonSimple>
          </a>
        )}
      </XStack>
    </XStack>
  )
})

const UserButton = () => {
  const { user, loggedIn } = useAuth()

  return (
    <>
      <ButtonSimple
        onPress={(e) => {
          if (loggedIn) {
            e.preventDefault()
            updateUserState({
              showSidePanel: 'user',
            })
            return
          }

          ensureSignedUp()
        }}
      >
        {user?.image ? <Avatar size={20} image={user.image} /> : <UserCircle size={20} o={0.5} />}
      </ButtonSimple>
    </>
  )
}

const TopBarSearch = () => {
  const inputRef = useRef<Input>(null)

  useHotkeys('meta+f', () => {
    inputRef.current?.focus()
  })

  return (
    <XStack ai="center" gap="$2" mr="$4">
      <Search size={16} o={0.5} />
      <Input ref={inputRef} w={250} placeholder="" size="$2" h={26} bw={0} />
    </XStack>
  )
}
