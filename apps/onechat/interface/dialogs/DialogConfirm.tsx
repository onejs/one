import { useState } from 'react'
import { Dialog, H3, Paragraph, XStack, YStack } from 'tamagui'
import { createEmitter } from '~/helpers/emitter'
import { ButtonSimple } from '../ButtonSimple'
import { DialogContent, dialogEmitter, DialogOverlay, useDialogEmitter } from './shared'
import type { DialogConfirmType } from './types'

const [dialogConfirmEmitter] = createEmitter<boolean>()

export const dialogConfirm = async (props: Omit<DialogConfirmType, 'type'>) => {
  dialogEmitter.emit({
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
              <ButtonSimple
                onPress={() => {
                  dialogConfirmEmitter.emit(false)
                  setState(null)
                }}
              >
                Cancel
              </ButtonSimple>
            </Dialog.Close>

            <ButtonSimple
              onPress={() => {
                dialogConfirmEmitter.emit(true)
                setState(null)
              }}
            >
              Accept
            </ButtonSimple>
          </XStack>
        </DialogContent>
      </Dialog.Portal>
    </Dialog>
  )
}
