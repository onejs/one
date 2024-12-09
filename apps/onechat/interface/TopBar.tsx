import { Search, Settings2, UserCircle } from '@tamagui/lucide-icons'
import { H3, Input, styled, XStack } from 'tamagui'
import { githubSignIn } from '~/features/auth/githubSignIn'
import { useAuth } from '~/features/auth/useAuth'
import { isTauri } from '~/features/tauri/constants'

export const TopBar = () => {
  const { user } = useAuth()

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
      </XStack>
    </XStack>
  )
}

const UserButton = () => {
  const { user, loggedIn } = useAuth()

  return (
    <>
      <a
        target="_blank"
        href={loggedIn ? '' : window.location.origin + '/login-github'}
        rel="noreferrer"
        onClick={(e) => {
          if (isTauri || loggedIn) return
          e.preventDefault()
          githubSignIn()
        }}
      >
        <ThreadButtonFrame circular>
          {user?.image ? (
            <img style={{ width: 20, height: 20, borderRadius: 100 }} src={user.image} />
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
