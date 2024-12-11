import { useState } from 'react'
import { Button, Circle, Dialog, H3, Input, ScrollView, Separator, XStack, YStack } from 'tamagui'
import { createEmitter } from '~/helpers/emitter'
// import { Button } from '../Button'
import { DialogContent, dialogEmitter, DialogOverlay, useDialogEmitter } from './shared'
import { LabeledRow } from '../forms/LabeledRow'

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
    }
  })

  return (
    <Dialog modal open={!!show}>
      <Dialog.Portal>
        <DialogOverlay
          onPress={() => {
            setShow(false)
          }}
        />

        <DialogContent>
          <YStack f={1}>
            <YStack gap="$2">
              <H3>Create Server</H3>
              <Separator />
            </YStack>

            <ScrollView>
              <YStack py="$4" gap="$2">
                <LabeledRow label="Name" htmlFor="name">
                  <Input f={1} id="name" />
                </LabeledRow>

                <LabeledRow label="Avatar" htmlFor="avatar">
                  <Circle size={100} bg="$color5" />
                </LabeledRow>
              </YStack>
            </ScrollView>
          </YStack>

          <XStack jc="flex-end" gap="$2">
            <Dialog.Close asChild>
              <Button
                onPress={() => {
                  setShow(false)
                }}
              >
                Cancel
              </Button>
            </Dialog.Close>

            <Button
              theme="active"
              onPress={() => {
                setShow(false)
              }}
            >
              Accept
            </Button>
          </XStack>
        </DialogContent>
      </Dialog.Portal>
    </Dialog>
  )
}
