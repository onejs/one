import { Check, DoorOpen } from '@tamagui/lucide-icons'
import { useEffect, useRef, useState } from 'react'
import { ScrollView, TooltipSimple, XStack, YStack } from 'tamagui'
import { useAuth } from '~/better-auth/authClient'
import { mutate, useQuery } from '~/zero/zero'
import { Avatar } from '../Avatar'
import { Row } from '../Row'
import { SearchableInput, SearchableList, SearchableListItem } from '../SearchableList'
import { AlwaysVisibleTabContent } from './AlwaysVisibleTabContent'
import type { TabContentPaneProps } from './types'

export const DialogJoinServerContent = (props: TabContentPaneProps) => {
  const isActive = props.active === props.value
  const inputRef = useRef<HTMLInputElement>(null)
  const [search, setSearch] = useState('')
  const { user } = useAuth()

  const [foundServers] = useQuery((q) =>
    q.server
      .where('name', 'ILIKE', `%${search}%`)
      .limit(!search ? 0 : 10)
      .related('members', (q) => q.limit(1).where('id', user?.id || ''))
  )

  useEffect(() => {
    if (isActive) {
      setTimeout(() => {
        inputRef.current?.focus()
      }, 40)
    }
  }, [isActive])

  return (
    <AlwaysVisibleTabContent {...props}>
      <SearchableList
        onSelectItem={(item) => {
          // TODO
        }}
        items={foundServers}
      >
        <SearchableInput mb="$1" ref={inputRef as any} size="$6" onChangeText={setSearch} />

        <ScrollView>
          <YStack gap="$2">
            {foundServers.map((server, index) => {
              const isJoined = !!server.members[0]

              return (
                <SearchableListItem index={index} key={server.id}>
                  {(active, itemProps) => {
                    return (
                      <Row active={active} {...itemProps}>
                        <Avatar image={server.icon} />
                        <Row.Text>{server.name}</Row.Text>
                        <XStack f={1} />
                        <TooltipSimple label={isJoined ? 'Joined!' : 'Join server'}>
                          <Row.Button
                            onPress={() => {
                              if (!user) return

                              if (isJoined) {
                                // TODO
                              } else {
                                mutate.serverMember.insert({
                                  userId: user.id,
                                  serverId: server.id,
                                })
                              }
                            }}
                            icon={isJoined ? Check : DoorOpen}
                          />
                        </TooltipSimple>
                      </Row>
                    )
                  }}
                </SearchableListItem>
              )
            })}
          </YStack>
        </ScrollView>
      </SearchableList>
    </AlwaysVisibleTabContent>
  )
}
