import { Plus } from '@tamagui/lucide-icons'
import { createEmitter } from '@vxrn/emitter'
import { useEffect, useState } from 'react'
import { Button, Circle, H2, H3, H5, Input, Sheet, SizableText, XStack, YStack } from 'tamagui'
import { useAuth } from '~/better-auth/authClient'
import { DevTools } from '~/dev/DevTools'
import { randomID } from '~/helpers/randomID'
import { hiddenPanelWidth } from '~/interface/settings/constants'
import { useCurrentServer, useCurrentServerRoles } from '~/state/server'
import type { Role, Server } from '~/zero/schema'
import { mutate } from '~/zero/zero'
import { Avatar } from '../Avatar'
import { ButtonSimple } from '../ButtonSimple'
import { AlwaysVisibleTabContent } from '../dialogs/AlwaysVisibleTabContent'
import { LabeledRow } from '../forms/LabeledRow'
import { EditableListItem, type EditableListItemProps } from '../lists/EditableListItem'
import { SortableList } from '../lists/SortableList'
import { Tabs } from '../tabs/Tabs'
import { showToast } from '../toast/Toast'
import { AvatarUpload } from '../upload/AvatarUpload'
import { Switch } from '../forms/Switch'

const actionEmitter = createEmitter<'create-role'>()

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

        <XStack f={1} />

        <XStack ai="center" pe="auto">
          {tab === 'permissions' && (
            <ButtonSimple
              icon={Plus}
              tooltip="Create new role"
              onPress={() => {
                actionEmitter.emit('create-role')
              }}
            >
              Role
            </ButtonSimple>
          )}
        </XStack>
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
  const { user } = useAuth()
  const roles = useCurrentServerRoles() || []
  const [showTempRole, setShowTempRole] = useState(false)
  const [selected, setSelected] = useState<Role | null>(null)

  actionEmitter.use((action) => {
    if (action == 'create-role') {
      setShowTempRole(true)
    }
  })

  return (
    <YStack data-tauri-drag-region f={1}>
      <YStack f={1}>
        <SortableList
          items={roles}
          renderItem={(role) => (
            <RoleListItem
              active={selected?.id === role.id}
              editingValue={role.name}
              onPress={() => {
                setSelected(role)
              }}
              key={role.id}
              role={role}
            />
          )}
          renderDraggingItem={(role) => <RoleListItem key={role.id} role={role} />}
          onSort={(sorted) => {
            //
          }}
        />

        {showTempRole && (
          <RoleListItem
            defaultEditing
            onEditComplete={(name) => {
              const id = randomID()
              setShowTempRole(false)
              mutate.role.insert({
                id,
                color: 'gray',
                creatorID: user?.id || '',
                name,
                serverID: server.id,
              })
            }}
            onEditCancel={() => setShowTempRole(false)}
          />
        )}
      </YStack>

      <Sheet animation="bouncy" open={!!selected}>
        <Sheet.Frame br="$6" elevation="$4" p="$4">
          <H5 o={0.5}>{selected?.name}</H5>

          <LabeledRow
            htmlFor="manage-server"
            label="Manage Server"
            description="Allow user to change server settings."
          >
            <Switch size="$3" id="manage-server" />
          </LabeledRow>

          <LabeledRow
            htmlFor="edit-channels"
            label="Edit Channels"
            description="Allow user to change channel names, add and remove."
          >
            <Switch size="$3" id="edit-channels" />
          </LabeledRow>
        </Sheet.Frame>
      </Sheet>
    </YStack>
  )
}

const RoleListItem = ({ role, ...rest }: Omit<EditableListItemProps, 'role'> & { role?: Role }) => {
  return (
    <EditableListItem
      icon={<Circle size={24} bg={role?.color || 'gray'} />}
      after={<SizableText>3 members</SizableText>}
      {...rest}
    >
      {role?.name || ''}
    </EditableListItem>
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
