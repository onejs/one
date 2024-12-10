import { ChevronLeft, Search, Settings2, UserCircle, Users } from '@tamagui/lucide-icons'
import { memo } from 'react'
import { Button, H3, Input, styled, XStack } from 'tamagui'
import { githubSignIn } from '~/features/auth/githubSignIn'
import { useAuth } from '~/features/auth/useAuth'
import { updateUserState, useUserState } from '~/features/auth/useUserState'
import { isTauri } from '~/features/tauri/constants'
import { Avatar } from './Avatar'

export const TopBar = memo(() => {
  const { user, session, jwtToken } = useAuth()

  return (
    <XStack
      data-tauri-drag-region
      br="$4"
      mx={2}
      ai="center"
      jc="space-between"
      y={2}
      h={36}
      pl={80}
      pr={4}
      mb={4}
    >
      <H3 pe="none" m={0} o={0.5} size="$2">
        One - #general
      </H3>

      <XStack ai="center" gap="$1">
        <XStack ai="center" gap="$2" mr="$4">
          <Search size={16} o={0.5} />
          <Input w={250} placeholder="" size="$2" bw={0} />
        </XStack>

        <ThreadButtonFrame>
          <Settings2 o={0.5} size={20} />
        </ThreadButtonFrame>

        <UserButton />

        {!isTauri && jwtToken && (
          <a href={`one-chat://finish-auth?token=${session?.token}`}>
            <Button size="$2">Open native app</Button>
          </a>
        )}
      </XStack>
    </XStack>
  )
})

const UserButton = () => {
  const { user, loggedIn } = useAuth()
  const userState = useUserState()

  return (
    <>
      <a
        target="_blank"
        {...(!loggedIn &&
          !userState?.showSidePanel && {
            href: window.location.origin + '/login-github',
          })}
        rel="noreferrer"
        // biome-ignore lint/a11y/useValidAnchor: <explanation>
        onClick={(e) => {
          if (userState?.showSidePanel) {
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
        <ThreadButtonFrame circular>
          {userState?.showSidePanel === 'user' ? (
            <ChevronLeft size={20} o={0.5} />
          ) : user?.image ? (
            <Avatar image={user.image} />
          ) : (
            <UserCircle size={20} o={0.5} />
          )}
        </ThreadButtonFrame>
      </a>
    </>
  )
}

const ThreadButtonFrame = styled(XStack, {
  ai: 'center',
  gap: '$2',
  py: '$1.5',
  px: '$2.5',
  br: '$4',
  hoverStyle: {
    bg: '$color3',
  },

  variants: {
    active: {
      true: {
        bg: '$color3',
      },
    },

    size: {
      large: {
        py: '$3',
        px: '$4',
      },
    },

    circular: {
      true: {
        borderRadius: 100,
        overflow: 'hidden',
      },
    },
  } as const,
})
