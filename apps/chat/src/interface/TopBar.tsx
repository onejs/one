import { ChevronLeft, Search, Settings2, UserCircle } from '@tamagui/lucide-icons'
import { memo, useRef } from 'react'
import { useHotkeys } from 'react-hotkeys-hook'
import { H1, Input, TooltipSimple, XStack } from 'tamagui'
import { githubSignIn } from '~/better-auth/githubSignIn'
import { useAuth } from '~/better-auth/useAuth'
import { HotMenu } from '~/interface/hotmenu/HotMenu'
import { useCurrentChannel, useCurrentServer } from '~/state/server'
import { updateUserState, useUserState } from '~/state/user'
import { isTauri } from '~/tauri/constants'
import { Avatar } from './Avatar'
import { ButtonSimple } from './ButtonSimple'

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
  const [userState] = useUserState()
  const shouldLink = !loggedIn && !userState?.showSidePanel

  return (
    <>
      <a
        target="_blank"
        {...(shouldLink && {
          href: window.location.origin + '/login-github',
        })}
        rel="noreferrer"
        // biome-ignore lint/a11y/useValidAnchor: <explanation>
        onClick={(e) => {
          if (userState?.showSidePanel === 'user') {
            e.preventDefault()
            updateUserState({
              showSidePanel: undefined,
            })
            return
          }

          if (loggedIn) {
            e.preventDefault()
            updateUserState({
              showSidePanel: 'user',
            })
            return
          }

          if (!isTauri) {
            e.preventDefault()
            githubSignIn()
            return
          }
        }}
      >
        <ButtonSimple>
          {userState?.showSidePanel === 'user' ? (
            <ChevronLeft size={20} o={0.5} />
          ) : user?.image ? (
            <Avatar image={user.image} />
          ) : (
            <UserCircle size={20} o={0.5} />
          )}
        </ButtonSimple>
      </a>
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
