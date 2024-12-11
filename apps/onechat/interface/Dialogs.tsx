import { useState } from 'react'
import { Dialog, H3, Paragraph, XStack } from 'tamagui'
import { createEmitter } from '~/helpers/emitter'
import { Button } from './Button'
import { YStack } from 'tamagui'

export const Dialogs = () => {
  return <ConfirmDialog />
}

type ConfirmDialog = {
  type: 'confirm'
  title: string
  description: string
}

type DialogType = ConfirmDialog

export const [dialogEmitter, useDialogEmitter] = createEmitter<DialogType>()

const [confirmDialogEmitter] = createEmitter<boolean>()

export const confirmDialog = async (props: Omit<ConfirmDialog, 'type'>) => {
  dialogEmitter.trigger({
    type: 'confirm',
    ...props,
  })

  return new Promise((res) => {
    const dispose = confirmDialogEmitter.listen((val) => {
      dispose()
      res(val)
    })
  })
}

const ConfirmDialog = () => {
  const [state, setState] = useState<ConfirmDialog | null>(null)

  useDialogEmitter((next) => {
    if (next.type === 'confirm') {
      setState(next)
    }
  })

  return (
    <Dialog modal open={!!state}>
      <Dialog.Portal>
        <Dialog.Overlay
          key="overlay"
          animation="quickest"
          enterStyle={{ opacity: 0 }}
          exitStyle={{ opacity: 0 }}
          bg="$background075"
          onPress={() => {
            setState(null)
          }}
        />

        <Dialog.Content
          bordered
          elevate
          bg="$color2"
          key="content"
          w="60%"
          h="30%"
          miw={200}
          maw={500}
          mih={300}
          mah={380}
          animation={[
            'quickest',
            {
              opacity: {
                overshootClamping: true,
              },
            },
          ]}
          enterStyle={{ x: 0, y: -10, opacity: 0 }}
          exitStyle={{ x: 0, y: 10, opacity: 0 }}
          gap="$4"
        >
          <YStack f={1}>
            <H3>{state?.title}</H3>
            <Paragraph>{state?.description}</Paragraph>
          </YStack>

          <XStack jc="flex-end" gap="$2">
            <Dialog.Close asChild>
              <Button
                onPress={() => {
                  confirmDialogEmitter.trigger(false)
                  setState(null)
                }}
              >
                Cancel
              </Button>
            </Dialog.Close>

            <Button
              onPress={() => {
                confirmDialogEmitter.trigger(true)
                setState(null)
              }}
            >
              Accept
            </Button>
          </XStack>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog>
  )
}
