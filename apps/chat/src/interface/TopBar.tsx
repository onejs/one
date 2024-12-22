import { ChevronRight, Search, Settings2, UserCircle } from '@tamagui/lucide-icons'
import { memo, useRef } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { H1, Input, TooltipSimple, XStack, YStack } from 'tamagui'
import { useAuth } from '~/better-auth/authClient'
import { HotMenu } from '~/interface/hotmenu/HotMenu'
import { useCurrentChannel, useCurrentServer } from '~/state/server'
import { updateUserState, useUserState } from '~/state/user'
import { isTauri } from '~/tauri/constants'
import { Avatar } from './Avatar'
import { ButtonSimple } from './ButtonSimple'
import { ensureSignedUp } from './dialogs/actions'

export const TopBar = memo(() => {
  const { session, jwtToken } = useAuth()

  const server = useCurrentServer()
  const channel = useCurrentChannel()
  const [userState] = useUserState()

  const authTauriDeepLink = `one-chat://finish-auth?session=${session?.token || ''}&token=${jwtToken}`

  return (
    <XStack
      data-tauri-drag-region
      br="$4"
      mx={2}
      ai="center"
      jc="space-between"
      y={2}
      h={34}
      pl={72}
      pr={4}
      mb={4}
    >
      <XStack gap="$2">
        <TooltipSimple label="Menu">
          <HotMenu />
        </TooltipSimple>

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
          <a href={authTauriDeepLink}>
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
      <Input ref={inputRef} w={250} placeholder="" size="$2" bw={0} />
    </XStack>
  )
}
