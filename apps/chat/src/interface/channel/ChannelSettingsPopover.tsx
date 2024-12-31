import { Check, Plus, Settings, X } from '@tamagui/lucide-icons'
import { useState } from 'react'
import { Button, Circle, H4, H5, Popover, TooltipSimple, XStack, YStack } from 'tamagui'
import { useCurrentChannel } from '~/state/channel/useCurrentChannel'
import { Role, zero } from '~/zero'
import { AlwaysVisibleTabContent } from '../dialogs/AlwaysVisibleTabContent'
import { Checkbox } from '../forms/Checkbox'
import { LabeledRow } from '../forms/LabeledRow'
import { PopoverContent } from '../Popover'
import { Tabs } from '../tabs/Tabs'
import { SearchableInput, SearchableList, SearchableListItem } from '../SearchableList'
import { useCurrentChannelPermissions } from '../../state/channel/useCurrentChannelPermissions'
import { Row } from '../Row'
import { useCurrentServerRoles } from '../../state/server/useCurrentServerRoles'

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

      <PopoverContent miw={600} mih="calc(80vh)" p="$3">
        <H4>{channel.name}</H4>

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
  const rolesWithPermission: (Role & { hasPermission?: boolean })[] = []

  for (const permission of permissions || []) {
    if (permission.role) {
      added.add(permission.roleId)
      rolesWithPermission.push({
        ...permission.role,
        hasPermission: true,
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

          {rolesWithPermission.map((item, index) => {
            return (
              <SearchableListItem key={index} index={index}>
                {(active, index) => {
                  return (
                    <Row active={active}>
                      <Circle size={24} bg="$color4" />
                      <Row.Text>{item.name}</Row.Text>
                      <XStack f={1} />
                      <Row.Button icon={item.hasPermission ? X : Plus}></Row.Button>
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

const ChannelSettings = () => {
  const channel = useCurrentChannel()

  if (!channel) {
    return null
  }

  return (
    <>
      <LabeledRow htmlFor="private" label="Private">
        <Checkbox
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
