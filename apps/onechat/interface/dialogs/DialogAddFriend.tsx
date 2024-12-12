import { useEffect, useRef, useState } from 'react'
import { Dialog, Input, YStack } from 'tamagui'
import { createEmitter } from '~/helpers/emitter'
import { DialogContent, dialogEmitter, DialogOverlay, useDialogEmitter } from './shared'

const [dialogCreateServerEmitter] = createEmitter<boolean>()

export const dialogAddFriend = async () => {
  dialogEmitter.trigger({
    type: 'add-friend',
  })

  return new Promise((res) => {
    const dispose = dialogCreateServerEmitter.listen((val) => {
      dispose()
      res(val)
    })
  })
}

const success = () => dialogCreateServerEmitter.trigger(true)
const cancel = () => dialogCreateServerEmitter.trigger(false)

export const DialogAddFriend = () => {
  const [show, setShow] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useDialogEmitter((next) => {
    if (next.type === 'add-friend') {
      setShow(true)
    } else {
      setShow(false)
      cancel()
    }
  })

  useEffect(() => {
    if (show) {
      inputRef.current?.focus()
    }
  }, [show])

  return (
    <Dialog modal open={show}>
      <Dialog.Portal>
        <DialogOverlay
          key="overlay"
          onPress={() => {
            setShow(false)
            cancel()
          }}
        />

        <DialogContent key="content">
          <Input ref={inputRef as any} f={1} id="server-name" />
          <YStack f={10}></YStack>
        </DialogContent>
      </Dialog.Portal>
    </Dialog>
  )
}
