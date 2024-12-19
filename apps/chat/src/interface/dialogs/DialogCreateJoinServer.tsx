import { useEffect, useRef, useState } from 'react'
import { Button, Dialog, Input, ScrollView, XStack, YStack } from 'tamagui'
import { insertServer } from '~/state/mutateServer'
import { createEmitter } from '~/helpers/emitter'
import { LabeledRow } from '../forms/LabeledRow'
import { Tabs } from '../tabs/Tabs'
import { AvatarUpload } from '../upload/AvatarUpload'
import { AlwaysVisibleTabContent } from './AlwaysVisibleTabContent'
import { DialogJoinServerContent } from './DialogJoinServerContent'
import { DialogContent, dialogEmit, DialogOverlay, useDialogEmit } from './shared'
import type { TabContentPaneProps } from './types'

const [emit, listen] = createEmitter<boolean>()

export const dialogCreateServer = async () => {
  dialogEmit({
    type: 'create-server',
  })
  return new Promise((res) => {
    const dispose = listen((val) => {
      dispose()
      res(val)
    })
  })
}

export const dialogJoinServer = async () => {
  dialogEmit({
    type: 'join-server',
  })
  return new Promise((res) => {
    const dispose = listen((val) => {
      dispose()
      res(val)
    })
  })
}

const success = () => emit(true)
const cancel = () => emit(false)

export const DialogCreateJoinServer = () => {
  const [show, setShow] = useState(false)
  const [tab, setTab] = useState('create')

  useDialogEmit((next) => {
    if (next.type === 'create-server' || next.type === 'join-server') {
      setShow(true)
      setTab(next.type === 'create-server' ? 'create' : 'join')
    } else {
      setShow(false)
      cancel()
    }
  })

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
          <Tabs
            initialTab={tab}
            onValueChange={setTab}
            tabs={[
              { label: 'Create', value: 'create' },
              { label: 'Join', value: 'join' },
            ]}
          >
            <YStack pos="relative" f={1} w="100%">
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
      <YStack f={1}>
        <ScrollView m="$-1">
          <YStack py="$4" gap="$2" px="$1">
            <LabeledRow label="Name" htmlFor="server-name">
              <Input ref={inputRef as any} f={1} id="server-name" />
            </LabeledRow>

            <LabeledRow label="Image" htmlFor="image">
              <AvatarUpload onChangeImage={setImage} />
            </LabeledRow>
          </YStack>
        </ScrollView>
      </YStack>

      <XStack jc="flex-end" gap="$2">
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
            insertServer({
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
