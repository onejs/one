import { useState } from 'react'
import { Dialog, H3, Paragraph, XStack, YStack } from 'tamagui'
import { createEmitter } from '~/helpers/emitter'
import { Button } from '../Button'
import { DialogContent, dialogEmitter, DialogOverlay, useDialogEmitter } from './shared'
import type { DialogConfirmType } from './types'

const [dialogConfirmEmitter] = createEmitter<boolean>()

export const dialogConfirm = async (props: Omit<DialogConfirmType, 'type'>) => {
  dialogEmitter.trigger({
    type: 'confirm',
    ...props,
  })

  return new Promise((res) => {
    const dispose = dialogConfirmEmitter.listen((val) => {
      dispose()
      res(val)
    })
  })
}

export const DialogConfirm = () => {
  const [state, setState] = useState<DialogConfirmType | null>(null)

  useDialogEmitter((next) => {
    if (next.type === 'confirm') {
      setState(next)
    }
  })

  return (
    <Dialog modal open={!!state}>
      <Dialog.Portal>
        <DialogOverlay
          onPress={() => {
            setState(null)
          }}
        />

        <DialogContent>
          <YStack f={1}>
            <H3>{state?.title}</H3>
            <Paragraph>{state?.description}</Paragraph>
          </YStack>

          <XStack jc="flex-end" gap="$2">
            <Dialog.Close asChild>
              <Button
                onPress={() => {
                  dialogConfirmEmitter.trigger(false)
                  setState(null)
                }}
              >
                Cancel
              </Button>
            </Dialog.Close>

            <Button
              onPress={() => {
                dialogConfirmEmitter.trigger(true)
                setState(null)
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
