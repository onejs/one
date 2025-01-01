import { Check, Lock, Plus, Settings, X } from '@tamagui/lucide-icons'
import { useState } from 'react'
import {
  Button,
  Circle,
  H4,
  H5,
  Popover,
  SizableText,
  styled,
  TooltipSimple,
  XStack,
  YStack,
} from 'tamagui'
import { useCurrentChannel } from '~/state/channel/useCurrentChannel'
import { type Role, zero } from '~/zero'
import { useAuth } from '../../better-auth/authClient'
import { randomId } from '../../helpers/randomId'
import { useCurrentChannelPermissions } from '../../state/channel/useCurrentChannelPermissions'
import { useCurrentServerRoles } from '../../state/server/useCurrentServerRoles'
import { AlwaysVisibleTabContent } from '../dialogs/AlwaysVisibleTabContent'
import { LabeledRow } from '../forms/LabeledRow'
import { Switch } from '../forms/Switch'
import { PopoverContent } from '../Popover'
import { Row } from '../Row'
import { SearchableInput, SearchableList, SearchableListItem } from '../SearchableList'
import { Tabs } from '../tabs/Tabs'

export const ChannelSettingsPopover = () => {
  const channel = useCurrentChannel()
  const [tab, setTab] = useState('settings')

  if (!channel) {
    return null
  }

  return (
    <Popover allowFlip stayInFrame={{ padding: 10 }}>
      <Popover.Trigger>
        <TooltipSimple label="Channel settings">
          <Button chromeless size="$2.5" scaleIcon={1.3}>
            <Settings size={18} o={0.5} />
          </Button>
        </TooltipSimple>
      </Popover.Trigger>

      <PopoverContent miw={600} mih="calc(80vh)" p="$3" gap="$3">
        <XStack w="100%" jc="center" ai="center" gap="$2">
          <SizableText size="$3" o={0.3}>
            #
          </SizableText>
          <H4 size="$5">{channel.name}</H4>
        </XStack>

        <Tabs
          initialTab="settings"
          onValueChange={setTab}
          tabs={[
            { label: 'Settings', value: 'settings' },
            { label: 'Members', value: 'members' },
            { label: 'Permissions', value: 'permissions' },
          ]}
        >
          <YStack pos="relative" f={1} w="100%">
            <AlwaysVisibleTabContent active={tab} value="settings">
              <ChannelSettings />
            </AlwaysVisibleTabContent>

            <AlwaysVisibleTabContent active={tab} value="members">
              <ChannelMembers />
            </AlwaysVisibleTabContent>

            <AlwaysVisibleTabContent active={tab} value="permissions">
              <ChannelPermissions />
            </AlwaysVisibleTabContent>
          </YStack>
        </Tabs>
      </PopoverContent>
    </Popover>
  )
}

const ChannelMembers = () => {
  // this will be for setting access based on roles
  return (
    <YStack>
      <H5>Members</H5>
    </YStack>
  )
}

const ChannelPermissions = () => {
  const permissions = useCurrentChannelPermissions()
  const roles = useCurrentServerRoles() || []
  const added = new Set<string>()
  const rolesWithPermission: (Role & { permissionId?: string })[] = []
  const channel = useCurrentChannel()
  const { user } = useAuth()

  for (const permission of permissions || []) {
    if (permission.role) {
      added.add(permission.roleId)
      rolesWithPermission.push({
        ...permission.role,
        permissionId: permission.id,
      })
    }
  }
  for (const role of roles) {
    if (!added.has(role.id)) {
      rolesWithPermission.push(role)
    }
  }

  // this will be for setting access based on roles
  return (
    <YStack>
      <SearchableList items={permissions || []} onSelectItem={() => {}} onSearch={() => {}}>
        <YStack gap="$3">
          <SearchableInput size="$4" />

          {rolesWithPermission.map((role, index) => {
            return (
              <SearchableListItem key={index} index={index}>
                {(active, index) => {
                  const granted = !!role.permissionId
                  return (
                    <Row active={active}>
                      <Circle size={24} bg="$color4" />
                      <Row.Text o={granted ? 1 : 0.5}>{role.name}</Row.Text>
                      <XStack f={1} />
                      <Row.Button
                        onPress={() => {
                          if (!user || !channel) return

                          if (role.permissionId) {
                            zero.mutate.channelPermission.delete({
                              id: role.permissionId,
                            })
                          } else {
                            zero.mutate.channelPermission.insert({
                              id: randomId(),
                              channelId: channel.id,
                              granterId: user.id,
                              roleId: role.id,
                              serverId: channel.serverId,
                            })
                          }
                        }}
                        circular={false}
                        icon={granted ? null : Plus}
                      >
                        {granted ? '' : 'Grant'}

                        {granted && (
                          <YStack group="icon" fullscreen>
                            <HoverShowIcon>
                              <X size={18} />
                            </HoverShowIcon>
                            <HoverHideIcon>
                              <Check size={18} />
                            </HoverHideIcon>
                          </YStack>
                        )}
                      </Row.Button>
                    </Row>
                  )
                }}
              </SearchableListItem>
            )
          })}
        </YStack>
      </SearchableList>
    </YStack>
  )
}

const HoverHideIcon = styled(YStack, {
  animation: 'quick',
  o: 1,
  y: 0,
  fullscreen: true,
  ai: 'center',
  jc: 'center',
  '$group-icon-hover': {
    y: 5,
    o: 0,
  },
})

const HoverShowIcon = styled(YStack, {
  animation: 'quick',
  y: 5,
  o: 0,
  fullscreen: true,
  ai: 'center',
  jc: 'center',
  '$group-icon-hover': {
    y: 0,
    o: 1,
  },
})

const ChannelSettings = () => {
  const channel = useCurrentChannel()

  if (!channel) {
    return null
  }

  return (
    <>
      <LabeledRow icon={Lock} htmlFor="private" label="Private">
        <Switch
          size="$3"
          checked={channel.private}
          onCheckedChange={(val) => {
            zero.mutate.channel.update({
              ...channel,
              private: !!val,
            })
          }}
          id="private"
          name="private"
        />
      </LabeledRow>
    </>
  )
}
