import { Plus, Trash } from '@tamagui/lucide-icons'
import { createEmitter } from '@vxrn/emitter'
import { memo, useEffect, useState } from 'react'
import { Button, Circle, H3, H5, Input, Sheet, SizableText, XStack, YStack } from 'tamagui'
import { useAuth } from '~/better-auth/authClient'
import { DevTools } from '~/dev/DevTools'
import { randomId } from '~/helpers/randomId'
import { useCurrentServer } from '~/state/server/useCurrentServer'
import { useCurrentServerMembers } from '~/state/server/useCurrentServerMembers'
import { useCurrentServerRoles } from '~/state/server/useCurrentServerRoles'
import type { RolePermissionsKeys, RoleWithRelations, Server } from '~/zero'
import { zero } from '~/zero'
import { Avatar } from '../Avatar'
import { ButtonSimple } from '../ButtonSimple'
import { dialogConfirm } from '../dialogs/actions'
import { AlwaysVisibleTabContent } from '../dialogs/AlwaysVisibleTabContent'
import { LabeledRow } from '../forms/LabeledRow'
import { Switch } from '../forms/Switch'
import { EditableListItem, type EditableListItemProps } from '../lists/EditableListItem'
import { SortableList } from '../lists/SortableList'
import { SearchableInput, SearchableList, SearchableListItem } from '../SearchableList'
import { Tabs } from '../tabs/Tabs'
import { AvatarUpload } from '../upload/AvatarUpload'
import { UserRow } from '../users/UserRow'
import { SettingsPane } from './SettingsPane'

const actionEmitter = createEmitter<'create-role'>()

export const ServerSettingsPane = () => {
  return (
    <SettingsPane name="settings">
      <SettingsContents />
    </SettingsPane>
  )
}

const SettingsContents = memo(() => {
  const server = useCurrentServer()
  const [tab, setTab] = useState('settings')

  if (!server) {
    return null
  }

  return (
    <>
      <XStack pointerEvents="none" items="center" gap="$2">
        <Avatar size={28} image={server.icon} />
        <H3 select="none">{server?.name}</H3>

        <XStack flex={1} />

        <XStack items="center" pointerEvents="auto">
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
          <YStack position="relative" flex={1} width="100%">
            <AlwaysVisibleTabContent active={tab} value="settings">
              <SettingsServer server={server} />
            </AlwaysVisibleTabContent>

            <AlwaysVisibleTabContent active={tab} value="permissions">
              <SettingsServerPermissions server={server} />
            </AlwaysVisibleTabContent>
          </YStack>
        </Tabs>
      )}
    </>
  )
})

const SettingsServerPermissions = ({ server }: { server: Server }) => {
  const { user } = useAuth()

  const roles = useCurrentServerRoles() || []

  const [showTempRole, setShowTempRole] = useState(false)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const selected = selectedId ? roles.find((x) => x.id === selectedId) : null

  actionEmitter.use((action) => {
    if (action == 'create-role') {
      setShowTempRole(true)
    }
  })

  return (
    <YStack data-tauri-drag-region flex={1}>
      <YStack flex={1}>
        <SortableList
          items={roles}
          renderItem={(role) => (
            <RoleListItem
              active={selected?.id === role.id}
              editingValue={role.name}
              onPress={() => {
                setSelectedId(role.id)
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
              const id = randomId()
              setShowTempRole(false)
              zero.mutate.role.insert({
                id,
                color: 'gray',
                creatorId: user?.id || '',
                name,
                serverId: server.id,
              })
            }}
            onEditCancel={() => setShowTempRole(false)}
          />
        )}
      </YStack>

      <Sheet animation="quickest" open={!!selected}>
        <Sheet.Frame bg="$color2" rounded="$6" elevation="$4" p="$4">
          {selected && <ServerRolePermissionsPane role={selected} />}
        </Sheet.Frame>
      </Sheet>
    </YStack>
  )
}

type RolePaneTabs = 'abilities' | 'members'

const ServerRolePermissionsPane = ({ role }: { role: RoleWithRelations }) => {
  const [tab, setTab] = useState<RolePaneTabs>('abilities')

  return (
    <>
      <H5 size="$2" opacity={0.5} mb="$3">
        Role: {role?.name}
      </H5>

      <Tabs
        initialTab="abilities"
        // @ts-expect-error
        onValueChange={setTab}
        tabs={[
          { label: 'Abilities', value: 'abilities' },
          { label: 'Members', value: 'members' },
        ]}
      >
        <YStack position="relative" flex={1} width="100%">
          <AlwaysVisibleTabContent active={tab} value="abilities">
            <RoleSettingSwitch
              label="Admin"
              description="Allows all actions on a server."
              permissionsKey="canAdmin"
              role={role}
              requireConfirmation
            />

            <YStack
              {...(role.canAdmin && {
                opacity: 0.35,
                pe: 'none',
              })}
            >
              <RoleSettingSwitch
                label="Manage Server"
                description="Allow user to change server settings."
                permissionsKey="canEditServer"
                role={role}
              />

              <RoleSettingSwitch
                label="Edit Channels"
                description="Allow user to change channel names, add and remove."
                permissionsKey="canEditChannel"
                role={role}
              />
            </YStack>
          </AlwaysVisibleTabContent>

          <AlwaysVisibleTabContent active={tab} value="members">
            <ServerRolePermissionsPaneMembers role={role} />
          </AlwaysVisibleTabContent>
        </YStack>
      </Tabs>
    </>
  )
}

const ServerRolePermissionsPaneMembers = ({ role }: { role: RoleWithRelations }) => {
  const { user: currentUser } = useAuth()
  const serverMembers = useCurrentServerMembers()
  const members: Record<string, boolean> = {}
  for (const member of role.members) {
    members[member.id] = true
  }

  return (
    <SearchableList
      onSearch={() => {
        console.warn('todo')
      }}
      searchKey="name"
      items={serverMembers}
      onSelectItem={(item) => {}}
    >
      <SearchableInput size="$4" mb="$3" placeholder="Filter..." onKeyPress={(key) => {}} />

      {serverMembers.map((user, index) => {
        return (
          <SearchableListItem key={user.name} index={index}>
            {(active, itemProps, key) => {
              const isMember = members[user.id]

              return (
                <UserRow
                  key={key}
                  active={active}
                  user={user}
                  rowProps={itemProps}
                  action={
                    <Button
                      onPress={async () => {
                        if (!currentUser) {
                          throw new Error(`sign in`)
                        }

                        if (isMember) {
                          if (
                            !(await dialogConfirm({
                              title: `Remove user from role ${role.name}?`,
                            }))
                          ) {
                            return
                          }

                          await zero.mutate.userRole.delete({
                            roleId: role.id,
                            serverId: role.serverId,
                            userId: user.id,
                          })
                          return
                        }

                        // not member
                        await zero.mutate.userRole.insert({
                          roleId: role.id,
                          serverId: role.serverId,
                          userId: user.id,
                          granterId: currentUser.id,
                        })
                      }}
                      size="$3"
                      circular
                      {...(isMember
                        ? {
                            theme: 'red',
                            icon: Trash,
                          }
                        : {
                            theme: null,
                            icon: Plus,
                          })}
                    ></Button>
                  }
                />
              )
            }}
          </SearchableListItem>
        )
      })}
    </SearchableList>
  )
}

const RoleSettingSwitch = ({
  role,
  label,
  description,
  permissionsKey,
  requireConfirmation,
}: {
  role: RoleWithRelations
  label: string
  description: string
  permissionsKey: RolePermissionsKeys
  requireConfirmation?: boolean
}) => {
  const id = label.toLowerCase().replace(/\s+/g, '-')
  const value = !!role[permissionsKey]

  return (
    <LabeledRow htmlFor={id} label={label} description={description}>
      <Switch
        checked={value}
        size="$3"
        id={id}
        onCheckedChange={async (val) => {
          if (requireConfirmation) {
            if (
              !(await dialogConfirm({
                title: `Change admin setting?`,
                description: `This setting changes sensitive permissions, are you sure.`,
              }))
            ) {
              return
            }
          }

          zero.mutate.role.update({
            id: role.id,
            [permissionsKey]: val,
          })
        }}
      />
    </LabeledRow>
  )
}

const RoleListItem = ({
  role,
  ...rest
}: Omit<EditableListItemProps, 'role'> & { role?: RoleWithRelations }) => {
  return (
    <EditableListItem
      icon={<Circle size={24} bg={(role?.color as any) || 'gray'} />}
      after={<SizableText>{role?.members?.length} members</SizableText>}
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
        <Input onChangeText={setName} defaultValue={server.name} flex={1} id="server-name" />
      </LabeledRow>

      <LabeledRow label="Image" htmlFor="image">
        <AvatarUpload defaultImage={server.icon} onChangeImage={setImage} />
      </LabeledRow>

      <Button
        theme="accent"
        onPress={() => {
          console.warn('updating', name)
          zero.mutate.server.update({
            id: server.id,
            name,
            icon: image,
          })
          // showToast('Saved')
        }}
      >
        Save
      </Button>

      <DevTools />
    </>
  )
}
