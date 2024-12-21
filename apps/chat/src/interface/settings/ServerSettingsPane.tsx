import { useEffect, useState } from 'react'
import { Button, Circle, H3, H4, Input, SizableText, XStack, YStack } from 'tamagui'
import { DevTools } from '~/dev/DevTools'
import { hiddenPanelWidth } from '~/interface/settings/constants'
import { useCurrentServer, useCurrentServerRoles } from '~/state/server'
import type { Server } from '~/zero/schema'
import { mutate } from '~/zero/zero'
import { LabeledRow } from '../forms/LabeledRow'
import { showToast } from '../toast/Toast'
import { AvatarUpload } from '../upload/AvatarUpload'
import { Tabs } from '../tabs/Tabs'
import { AlwaysVisibleTabContent } from '../dialogs/AlwaysVisibleTabContent'
import { Avatar } from '../Avatar'
import { SortableList } from '../lists/SortableList'
import { ListItem } from '../lists/ListItem'

export const ServerSettingsPane = () => {
  const server = useCurrentServer()
  const [tab, setTab] = useState('settings')

  if (!server) {
    return null
  }

  return (
    <YStack
      h="100%"
      data-tauri-drag-region
      pos="absolute"
      t={0}
      r={-hiddenPanelWidth}
      w={hiddenPanelWidth}
      p="$4"
      gap="$4"
    >
      <XStack pe="none" ai="center" gap="$2">
        <Avatar size={28} image={server.icon} />
        <H3 userSelect="none">{server?.name}</H3>
      </XStack>

      {server && (
        <Tabs
          data-tauri-drag-region
          initialTab="settings"
          onValueChange={setTab}
          tabs={[
            { label: 'Settings', value: 'settings' },
            { label: 'Permissions', value: 'permissions' },
          ]}
        >
          <YStack pos="relative" f={1} w="100%">
            <AlwaysVisibleTabContent active={tab} value="settings">
              <SettingsServer server={server} />
            </AlwaysVisibleTabContent>

            <AlwaysVisibleTabContent active={tab} value="permissions">
              <SettingsServerPermissions server={server} />
            </AlwaysVisibleTabContent>
          </YStack>
        </Tabs>
      )}
    </YStack>
  )
}

const SettingsServerPermissions = ({ server }: { server: Server }) => {
  const roles = useCurrentServerRoles() || []

  return (
    <YStack data-tauri-drag-region f={1}>
      <SortableList
        items={roles}
        renderItem={(item) => (
          <ListItem key={item.id}>
            <Circle size={24} bg={item.color} />
            <SizableText>{item.name}</SizableText>

            <XStack f={1} />

            <XStack als="flex-end">
              <SizableText>3 members</SizableText>
            </XStack>
          </ListItem>
        )}
        renderDraggingItem={(item) => <ListItem key={item.id}></ListItem>}
        onSort={(sorted) => {
          //
        }}
      />
    </YStack>
  )
}

const SettingsServer = ({ server }: { server: Server }) => {
  const [image, setImage] = useState(server.icon)
  const [name, setName] = useState(server.name)

  useEffect(() => {
    setName(server.name)
    setImage(server.icon)
  }, [server.name, server.icon])

  return (
    <>
      <LabeledRow label="Name" htmlFor="server-name">
        <Input defaultValue={server.name} f={1} id="server-name" />
      </LabeledRow>

      <LabeledRow label="Image" htmlFor="image">
        <AvatarUpload defaultImage={server.icon} onChangeImage={setImage} />
      </LabeledRow>

      <Button
        theme="blue"
        onPress={() => {
          mutate.server.update({
            id: server.id,
            name,
            icon: image,
          })
          showToast('Saved')
        }}
      >
        Save
      </Button>

      <DevTools />
    </>
  )
}
