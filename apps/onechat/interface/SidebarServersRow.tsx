import { Plus } from '@tamagui/lucide-icons'
import { useEffect } from 'react'
import { Circle, ScrollView, styled, XStack, YStack } from 'tamagui'
import { useAuth } from '~/features/auth/useAuth'
import { updateUserState, useUserState } from '~/features/auth/useUserState'
import { randomID } from '~/features/zero/randomID'
import { useUserServers } from '~/features/zero/useServer'
import { mutate } from '~/features/zero/zero'

export const SidebarServersRow = () => {
  const servers = useUserServers()
  const [{ activeServer, activeChannels }] = useUserState()
  const { user } = useAuth()

  console.log('gogg', activeServer, activeChannels)

  return (
    <XStack>
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <SidebarIndent fd="row" gap="$2" py="$3">
          {servers.map((server) => {
            return (
              <CircleIconFrame
                onPress={() => {
                  updateUserState({
                    activeServer: server.id,
                  })
                }}
                key={server.id}
                size={42}
                bg={server.icon}
                active={activeServer === server.id}
              />
            )
          })}

          <Circle
            onPress={async () => {
              if (!user) {
                console.error('not signed in')
                return
              }

              const serverId = randomID()

              await mutate.server.insert({
                id: serverId,
                createdAt: new Date().getTime(),
                description: '',
                icon: Math.random() > 0.5 ? 'red' : 'pink',
                name: 'Lorem',
                ownerId: user.id,
              })

              await mutate.serverMember.insert({
                joinedAt: new Date().getTime(),
                serverId,
                userId: user.id,
              })

              await mutate.channel.insert({
                id: randomID(),
                createdAt: new Date().getTime(),
                description: '',
                name: 'Welcome',
                private: false,
                serverId,
              })

              updateUserState({
                activeServer: serverId,
              })

              console.log('inserting', serverId)
            }}
            size={42}
            bg="$color9"
          >
            <Plus />
          </Circle>
        </SidebarIndent>
      </ScrollView>
    </XStack>
  )
}

const CircleIconFrame = styled(Circle, {
  variants: {
    active: {
      true: {
        outlineColor: '#fff',
        outlineWidth: 2,
        outlineStyle: 'solid',
      },
    },
  } as const,
})

const SidebarIndent = styled(YStack, {
  px: '$3',
})
