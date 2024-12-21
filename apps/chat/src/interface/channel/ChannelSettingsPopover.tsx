import { Settings } from '@tamagui/lucide-icons'
import { useState } from 'react'
import { Button, H4, H5, Popover, TooltipSimple, YStack } from 'tamagui'
import { useCurrentChannel } from '~/state/server'
import { mutate } from '~/zero/zero'
import { Checkbox } from '../Checkbox'
import { AlwaysVisibleTabContent } from '../dialogs/AlwaysVisibleTabContent'
import { LabeledRow } from '../forms/LabeledRow'
import { PopoverContent } from '../Popover'
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
  // this will be for setting access based on roles
  return (
    <YStack>
      <H5>Permissions</H5>
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
            mutate.channel.update({
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
