import type React from 'react'
import { type DragEvent, useEffect, useRef, useState } from 'react'
import { Button, Dialog, Input, Paragraph, Progress, ScrollView, XStack, YStack } from 'tamagui'
import { insertServer } from '~/features/state/actions/mutateServer'
import { createEmitter } from '~/helpers/emitter'
import { Avatar } from '../Avatar'
import { LabeledRow } from '../forms/LabeledRow'
import { Tabs } from '../tabs/Tabs'
import { DialogContent, dialogEmitter, DialogOverlay, useDialogEmitter } from './shared'
import { DialogJoinServerContent } from './DialogJoinServerContent'
import { AlwaysVisibleTabContent } from './AlwaysVisibleTabContent'
import type { TabContentPaneProps } from './types'

const [emitter] = createEmitter<boolean>()

export const dialogCreateServer = async () => {
  dialogEmitter.trigger({
    type: 'create-server',
  })
  return new Promise((res) => {
    const dispose = emitter.listen((val) => {
      dispose()
      res(val)
    })
  })
}

export const dialogJoinServer = async () => {
  dialogEmitter.trigger({
    type: 'join-server',
  })
  return new Promise((res) => {
    const dispose = emitter.listen((val) => {
      dispose()
      res(val)
    })
  })
}

const success = () => emitter.trigger(true)
const cancel = () => emitter.trigger(false)

export const DialogCreateJoinServer = () => {
  const [show, setShow] = useState(false)
  const [tab, setTab] = useState('create')

  useDialogEmitter((next) => {
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
              <ImageUpload onChangeImage={setImage} />
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

interface UploadResponse {
  url?: string
  error?: string
}

const ImageUpload = ({ onChangeImage }: { onChangeImage: (cb: string) => void }) => {
  const [uploadUrl, setUploadUrl] = useState('')
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
  const [dropping, setDropping] = useState(false)
  const endpoint = `/api/image/upload`

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleUpload(file)
    }
  }

  const handleUpload = (file: File) => {
    if (!file) {
      setErrorMessage('Please select a file to upload.')
      return
    }

    setProgress(10)

    const formData = new FormData()
    formData.append('file', file)

    const xhr = new XMLHttpRequest()
    xhr.open('POST', endpoint)

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percentage = Math.round((event.loaded * 100) / event.total)
        setProgress(percentage)
      }
    }

    xhr.onload = () => {
      if (xhr.status === 200) {
        const response: UploadResponse = JSON.parse(xhr.response)

        if (response.url) {
          setProgress(0)
          setUploadUrl(response.url)
          onChangeImage(response.url)
        } else {
          setErrorMessage('Upload failed: ' + (response.error || 'No error message provided.'))
        }
      } else {
        setErrorMessage(`Upload failed with status: ${xhr.status}`)
      }
    }

    xhr.onerror = () => {
      setErrorMessage('Upload error: An error occurred while uploading the file.')
    }

    xhr.send(formData)
  }

  return (
    <YStack
      gap="$4"
      // @ts-expect-error
      onDrop={(event: DragEvent<HTMLDivElement>) => {
        event.preventDefault()
        event.stopPropagation()
        setDropping(false)
        const file = event.dataTransfer.files[0]
        if (file) handleUpload(file)
      }}
      onDragOver={(e) => {
        setDropping(true)
        e.preventDefault()
        e.stopPropagation()
      }}
      onDragLeave={() => {
        setDropping(false)
      }}
      {...(dropping && {
        bg: '$color4',
      })}
    >
      <Avatar size={100} image={uploadUrl} />

      <form action={endpoint} method="post" encType="multipart/form-data">
        <YStack>
          <input type="file" id="file" name="file" onChange={handleFileChange} />

          {!!(progress && progress !== 100) && (
            <Progress mt="$2" value={progress} bg="$color2">
              <Progress.Indicator bc="$color7" animation="bouncy" />
            </Progress>
          )}

          {!!errorMessage && <Paragraph theme="red">{errorMessage}</Paragraph>}
        </YStack>
      </form>
    </YStack>
  )
}
