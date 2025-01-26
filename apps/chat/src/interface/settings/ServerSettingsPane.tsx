import { Plus, Trash, X } from '@tamagui/lucide-icons'
import { createEmitter } from '@vxrn/emitter'
import { useEffect, useState } from 'react'
import { Button, Circle, H3, H5, Input, Sheet, SizableText, View, XStack, YStack } from 'tamagui'
import { useAuth } from '~/better-auth/authClient'
import { DevTools } from '~/dev/DevTools'
import { randomId } from '~/helpers/randomId'
import { hiddenPanelWidth } from '~/interface/settings/constants'
import { useCurrentServerRoles } from '~/state/server/useCurrentServerRoles'
import { useCurrentServerMembers } from '~/state/server/useCurrentServerMembers'
import { useCurrentServer } from '~/state/server/useCurrentServer'
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
import { updateUserState, useUserState } from '../../state/user'

const actionEmitter = createEmitter<'create-role'>()

export const ServerSettingsPane = () => {
  const server = useCurrentServer()
  const [tab, setTab] = useState('settings')
  const [userState] = useUserState()

  if (!server) {
    return null
  }

  return (
    <>
      <YStack fullscreen zi={99_000} bg="$shadow3" />
      <YStack
        h="100%"
        data-tauri-drag-region
        animation="quick"
        pos="absolute"
        r={0}
        bg="$color2"
        elevation="$4"
        t={0}
        o={0}
        x={-hiddenPanelWidth}
        w={hiddenPanelWidth}
        zi={100_000}
        p="$4"
        gap="$4"
        {...(userState.showSidePanel && {
          x: 0,
          o: 1,
          pe: 'auto',
        })}
      >
        {userState.showSidePanel && (
          <Button
            circular
            pos="absolute"
            t={0}
            l={0}
            zi={1000}
            icon={X}
            onPress={() => updateUserState({ showSidePanel: undefined })}
          ></Button>
        )}
        <XStack pe="none" ai="center" gap="$2">
          {server.icon && <Avatar size={28} image={server.icon} />}
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
    </>
  )
}

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
    <YStack data-tauri-drag-region f={1}>
      <YStack f={1}>
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
        <Sheet.Frame bg="$color2" br="$6" elevation="$4" p="$4">
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
      <H5 size="$2" o={0.5} mb="$3">
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
        <YStack pos="relative" f={1} w="100%">
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
                o: 0.35,
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
            {(active, itemProps) => {
              const isMember = members[user.id]

              return (
                <UserRow
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
                            theme: 'gray',
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
      icon={<Circle size={24} bg={role?.color || 'gray'} />}
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
        <Input onChangeText={setName} defaultValue={server.name} f={1} id="server-name" />
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
