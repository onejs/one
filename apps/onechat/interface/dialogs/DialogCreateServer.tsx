import { useState } from 'react'
import { Button, Circle, Dialog, H3, Input, ScrollView, Separator, XStack, YStack } from 'tamagui'
import { createEmitter } from '~/helpers/emitter'
import { LabeledRow } from '../forms/LabeledRow'
import { DialogContent, dialogEmitter, DialogOverlay, useDialogEmitter } from './shared'
import { Tabs } from '../tabs/Tabs'

const [dialogCreateServerEmitter] = createEmitter<boolean>()

export const dialogCreateServer = async () => {
  dialogEmitter.trigger({
    type: 'create-server',
  })

  return new Promise((res) => {
    const dispose = dialogCreateServerEmitter.listen((val) => {
      dispose()
      res(val)
    })
  })
}

export const DialogCreateServer = () => {
  const [show, setShow] = useState(false)

  useDialogEmitter((next) => {
    if (next.type === 'create-server') {
      setShow(true)
    } else {
      setShow(false)
    }
  })

  return (
    <Dialog modal open={show}>
      <Dialog.Portal>
        <DialogOverlay
          key="overlay"
          onPress={() => {
            setShow(false)
          }}
        />

        <DialogContent key="content">
          <Tabs
            initialTab="create"
            tabs={[
              { label: 'Create', value: 'create' },
              { label: 'Join', value: 'join' },
            ]}
          >
            <Tabs.Content value="create">
              <DialogCreateServerContent setShow={setShow} />
            </Tabs.Content>

            <Tabs.Content value="join">
              <DialogJoinServerContent setShow={setShow} />
            </Tabs.Content>
          </Tabs>
        </DialogContent>
      </Dialog.Portal>
    </Dialog>
  )
}

type ContentProps = {
  setShow: React.Dispatch<React.SetStateAction<boolean>>
}

const DialogCreateServerContent = (props: ContentProps) => {
  return (
    <>
      <YStack f={1}>
        <ScrollView>
          <YStack py="$4" gap="$2">
            <LabeledRow label="Name" htmlFor="name">
              <Input f={1} id="name" />
            </LabeledRow>

            <LabeledRow label="Avatar" htmlFor="avatar">
              <Circle size={100} bg="$color5" />
            </LabeledRow>

            <form action="/api/image/upload" method="post" enctype="multipart/form-data">
              <label for="file">Choose file to upload:</label>
              <input type="file" id="file" name="file" required />
              <button type="submit">Upload File</button>
            </form>
          </YStack>
        </ScrollView>
      </YStack>

      <XStack jc="flex-end" gap="$2">
        <Dialog.Close asChild>
          <Button
            onPress={() => {
              props.setShow(false)
            }}
          >
            Cancel
          </Button>
        </Dialog.Close>

        <Button
          theme="active"
          onPress={() => {
            props.setShow(false)
          }}
        >
          Accept
        </Button>
      </XStack>
    </>
  )
}
const DialogJoinServerContent = (props: ContentProps) => {
  return (
    <>
      <YStack gap="$2">
        <Input size="$5" autoFocus />
      </YStack>
    </>
  )
}
