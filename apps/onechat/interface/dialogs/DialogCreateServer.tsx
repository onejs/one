import React, { DragEvent, useState } from 'react'
import {
  Button,
  Circle,
  Dialog,
  Input,
  Paragraph,
  Progress,
  ScrollView,
  TabsContentProps,
  XStack,
  YStack,
} from 'tamagui'
import { createEmitter } from '~/helpers/emitter'
import { LabeledRow } from '../forms/LabeledRow'
import { Tabs } from '../tabs/Tabs'
import { DialogContent, dialogEmitter, DialogOverlay, useDialogEmitter } from './shared'

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
  const [tab, setTab] = useState('create')

  useDialogEmitter((next) => {
    if (next.type === 'create-server') {
      setShow(true)
    } else {
      setShow(false)
    }
  })

  return (
    <Dialog modal open={show}>
      <Dialog.Portal>
        <DialogOverlay
          key="overlay"
          onPress={() => {
            setShow(false)
          }}
        />

        <DialogContent key="content">
          <Tabs
            initialTab="create"
            onValueChange={setTab}
            tabs={[
              { label: 'Create', value: 'create' },
              { label: 'Join', value: 'join' },
            ]}
          >
            <YStack pos="relative" f={1} w="100%">
              <AlwaysVisibleTabContent active={tab} value="create">
                <DialogCreateServerContent setShow={setShow} />
              </AlwaysVisibleTabContent>

              <AlwaysVisibleTabContent active={tab} value="join">
                <DialogJoinServerContent setShow={setShow} />
              </AlwaysVisibleTabContent>
            </YStack>
          </Tabs>
        </DialogContent>
      </Dialog.Portal>
    </Dialog>
  )
}

const AlwaysVisibleTabContent = ({ active, ...props }: TabsContentProps & { active: string }) => {
  return (
    <Tabs.Content
      forceMount
      pos="absolute"
      t={0}
      l={0}
      r={0}
      b={0}
      o={0}
      pe="none"
      {...(active === props.value && {
        o: 1,
        pe: 'auto',
      })}
      {...props}
    />
  )
}

type ContentProps = {
  setShow: React.Dispatch<React.SetStateAction<boolean>>
}

const DialogCreateServerContent = (props: ContentProps) => {
  return (
    <>
      <YStack f={1}>
        <ScrollView m="$-1">
          <YStack py="$4" gap="$2" px="$1">
            <LabeledRow label="Name" htmlFor="name">
              <Input f={1} id="name" />
            </LabeledRow>

            <LabeledRow label="Image" htmlFor="image">
              <ImageUpload />
            </LabeledRow>
          </YStack>
        </ScrollView>
      </YStack>

      <XStack jc="flex-end" gap="$2">
        <Dialog.Close asChild>
          <Button
            onPress={() => {
              props.setShow(false)
            }}
          >
            Cancel
          </Button>
        </Dialog.Close>

        <Button
          theme="active"
          onPress={() => {
            props.setShow(false)
          }}
        >
          Accept
        </Button>
      </XStack>
    </>
  )
}

interface UploadResponse {
  url?: string
  error?: string
}

const ImageUpload = () => {
  const [uploadUrl, setUploadUrl] = useState('')
  const [progress, setProgress] = useState(0)
  const [errorMessage, setErrorMessage] = useState('')
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

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    event.stopPropagation()
    const file = event.dataTransfer.files[0]
    if (file) handleUpload(file)
  }

  const handleDragOver = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault() // Necessary to allow drop
    event.stopPropagation()
  }

  return (
    <YStack
      gap="$4"
      // @ts-expect-error
      onDrop={handleDrop}
      onDragOver={handleDragOver}
    >
      <Circle size={100} bg="$color5" ov="hidden">
        {uploadUrl && <img src={uploadUrl} width="100%" height="100%" />}
      </Circle>

      <form action={endpoint} method="post" encType="multipart/form-data">
        <YStack>
          <input type="file" id="file" name="file" onChange={handleFileChange} required />

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

const DialogJoinServerContent = (props: ContentProps) => {
  return (
    <>
      <YStack gap="$2">
        <Input size="$5" autoFocus />
      </YStack>
    </>
  )
}
