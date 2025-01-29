import { useEffect, useRef, useState } from 'react'
import { Button, Dialog, Input, ScrollView, XStack, YStack } from 'tamagui'
import { mutateInsertServer } from '~/state/server/mutateInsertServer'
import { LabeledRow } from '../forms/LabeledRow'
import { Tabs } from '../tabs/Tabs'
import { AvatarUpload } from '../upload/AvatarUpload'
import { serverDialogEmitter } from './actions'
import { AlwaysVisibleTabContent } from './AlwaysVisibleTabContent'
import { DialogJoinServerContent } from './DialogJoinServerContent'
import { DialogContent, DialogOverlay, useDialogEmit } from './shared'
import type { TabContentPaneProps } from './types'

const success = () => serverDialogEmitter.emit(true)
const cancel = () => serverDialogEmitter.emit(false)

export const DialogCreateJoinServer = () => {
  const [show, setShow] = useState(false)
  const [tab, setTab] = useState('create')

  useDialogEmit((next) => {
    if (next.type === 'create-server' || next.type === 'join-server') {
      setShow(true)
      setTab(next.type === 'create-server' ? 'create' : 'join')
    }
  })

  return (
    <Dialog modal onOpenChange={setShow} open={show}>
      <Dialog.Adapt platform="touch" when="sm">
        <Dialog.Sheet animation="medium" zIndex={200000} modal dismissOnSnapToBottom>
          <Dialog.Sheet.Overlay
            animation="quick"
            enterStyle={{ opacity: 0 }}
            exitStyle={{ opacity: 0 }}
          />
          <Dialog.Sheet.Handle />
          <Dialog.Sheet.Frame p="$4" gap="$4">
            <Dialog.Adapt.Contents />
          </Dialog.Sheet.Frame>
        </Dialog.Sheet>
      </Dialog.Adapt>

      <Dialog.Portal>
        <DialogOverlay
          key="overlay"
          onPress={() => {
            setShow(false)
            cancel()
          }}
        />

        <DialogContent key="content">
          <Tabs
            initialTab={tab}
            onValueChange={setTab}
            tabs={[
              { label: 'Create Server', value: 'create' },
              { label: 'Join Server', value: 'join' },
            ]}
          >
            <YStack position="relative" flex={1} width="100%">
              <DialogCreateServerContent value="create" active={tab} setShow={setShow} />
              <DialogJoinServerContent value="join" active={tab} setShow={setShow} />
            </YStack>
          </Tabs>
        </DialogContent>
      </Dialog.Portal>
    </Dialog>
  )
}

const DialogCreateServerContent = (props: TabContentPaneProps) => {
  const isActive = props.active === props.value
  const [image, setImage] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isActive) {
      inputRef.current?.focus()
    }
  }, [isActive])

  return (
    <AlwaysVisibleTabContent {...props}>
      <YStack flex={1}>
        <ScrollView m="$-1">
          <YStack py="$4" gap="$2" px="$1">
            <LabeledRow label="Name" htmlFor="server-name">
              <Input
                autoComplete="off"
                minW={300}
                ref={inputRef as any}
                flex={2}
                id="server-name"
              />
            </LabeledRow>

            <LabeledRow label="Image" htmlFor="image">
              <AvatarUpload onChangeImage={setImage} />
            </LabeledRow>
          </YStack>
        </ScrollView>
      </YStack>

      <XStack justify="flex-end" gap="$2">
        <Dialog.Close asChild>
          <Button
            onPress={() => {
              props.setShow(false)
              cancel()
            }}
          >
            Cancel
          </Button>
        </Dialog.Close>

        <Button
          theme="blue"
          onPress={() => {
            mutateInsertServer({
              name: inputRef.current?.value || 'Untitled',
              icon: image,
            })
            props.setShow(false)
            success()
          }}
        >
          Create
        </Button>
      </XStack>
    </AlwaysVisibleTabContent>
  )
}
