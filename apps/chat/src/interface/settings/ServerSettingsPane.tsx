import { useEffect, useState } from 'react'
import { Button, H3, Input, YStack } from 'tamagui'
import { DevTools } from '~/dev/DevTools'
import { hiddenPanelWidth } from '~/interface/settings/constants'
import { useCurrentServer } from '~/state/server'
import type { Server } from '~/zero/schema'
import { mutate } from '~/zero/zero'
import { LabeledRow } from '../forms/LabeledRow'
import { showToast } from '../Toast'
import { AvatarUpload } from '../upload/AvatarUpload'

export const ServerSettingsPane = () => {
  const server = useCurrentServer()

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
      <H3 userSelect="none">Server Settings</H3>

      {server && <EditServer server={server} />}

      <DevTools />
    </YStack>
  )
}

const EditServer = ({ server }: { server: Server }) => {
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
    </>
  )
}
