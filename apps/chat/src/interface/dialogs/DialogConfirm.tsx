import { useState } from 'react'
import { Button, Dialog, H3, Paragraph, XStack, YStack } from 'tamagui'
import { ButtonSimple } from '../ButtonSimple'
import { confirmEmitter } from './actions'
import { DialogContent, DialogOverlay, useDialogEmit } from './shared'
import type { DialogConfirmType } from './types'

export const DialogConfirm = () => {
  const [state, setState] = useState<DialogConfirmType | null>(null)

  useDialogEmit((next) => {
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

        <DialogContent minH={150}>
          <YStack flex={1}>
            <H3>{state?.title}</H3>
            <Paragraph>{state?.description}</Paragraph>
          </YStack>

          <XStack justify="flex-end" gap="$2">
            <Dialog.Close asChild>
              <Button
                onPress={() => {
                  confirmEmitter.emit(false)
                  setState(null)
                }}
              >
                Cancel
              </Button>
            </Dialog.Close>

            <Button
              theme="blue"
              onPress={() => {
                confirmEmitter.emit(true)
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
