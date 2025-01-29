import { Lock } from '@tamagui/lucide-icons'
import { useState } from 'react'
import { Button, Dialog, H3, XStack, YStack } from 'tamagui'
import { useTauriAuthDeepLink } from '~/tauri/authFlowHelpers'
import { ButtonSimple } from '../buttons/ButtonSimple'
import { DialogContent, DialogOverlay, useDialogEmit } from './shared'

export const DialogRedirectToTauri = () => {
  const [show, setShow] = useState(false)
  const link = useTauriAuthDeepLink()

  useDialogEmit((val) => {
    setShow(val.type === 'redirect-to-tauri')
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
          <YStack flex={1}>
            <H3>Login on Desktop</H3>

            <YStack flex={1} items="center" justify="center">
              <a href={link}>
                <Button
                  onPressOut={() => {
                    setShow(false)
                  }}
                  size="$5"
                  icon={Lock}
                >
                  Open app
                </Button>
              </a>
            </YStack>
          </YStack>

          <XStack justify="flex-end" gap="$2">
            <Dialog.Close asChild>
              <ButtonSimple
                onPress={() => {
                  setShow(false)
                }}
              >
                Cancel
              </ButtonSimple>
            </Dialog.Close>
          </XStack>
        </DialogContent>
      </Dialog.Portal>
    </Dialog>
  )
}
