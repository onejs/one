import type { RefMDEditor } from '@uiw/react-md-editor'
import { startTransition, useEffect, useRef, useState } from 'react'
import { Input, YStack, XStack, Progress, Button } from 'tamagui'
import { Image } from '@tamagui/image-next'
import { useAuth } from '~/better-auth/authClient'
import { Editor, type EditorRef } from '~/editor/Editor'
import { randomID } from '~/helpers/randomID'
import { useCurrentChannel, useCurrentServer } from '~/state/server'
import { getDerivedUserState, updateUserCurrentChannel, useCurrentThread } from '~/state/user'
import { zero } from '~/zero'
import { messagesListEmitter } from './MessagesList'
import { attachmentEmitter } from '../upload/DragDropFile'
import type { FileUpload } from '../upload/uploadImage'
import { X } from '@tamagui/lucide-icons'

let mainInputRef: EditorRef | null = null

export const MessageInput = ({ inThread }: { inThread?: boolean }) => {
  const inputRef = useRef<EditorRef>(null)
  const channel = useCurrentChannel()
  const server = useCurrentServer()
  const thread = useCurrentThread()
  const { user } = useAuth()
  const disabled = !user

  // on channel change, focus input
  useEffect(() => {
    if (!inThread) {
      if (!mainInputRef) {
        setTimeout(() => {
          mainInputRef = inputRef.current
          mainInputRef?.textarea?.focus()
        })
      }
    } else {
      setTimeout(() => {
        inputRef.current?.textarea?.focus()
      })

      return () => {
        // focus events cause layout shifts which can make animations bad
        setTimeout(() => {
          mainInputRef?.textarea?.focus()
        }, 50)
      }
    }
  }, [channel, inThread])

  return (
    <YStack btw={1} bc="$color4" p="$2" gap="$2">
      <Editor
        ref={inputRef}
        onKeyDown={(e) => {
          const key = e.key
          switch (key) {
            case 'ArrowUp': {
              messagesListEmitter.emit({
                type: 'move',
                value: 'up',
              })
              break
            }

            case 'ArrowDown': {
              messagesListEmitter.emit({
                type: 'move',
                value: 'down',
              })
              break
            }

            case 'Enter': {
              messagesListEmitter.emit({
                type: 'select',
              })
              break
            }

            case 'Escape': {
              inputRef.current?.textarea?.blur()

              if (getDerivedUserState().activeThread) {
                updateUserCurrentChannel({
                  openedThreadId: undefined,
                })

                if (mainInputRef) {
                  mainInputRef.textarea?.focus()
                }
              }
              break
            }
          }
        }}
        onSubmit={(content) => {
          if (!user) {
            console.error('no user')
            return
          }
          if (!content) {
            return
          }

          inputRef.current?.clear?.()

          zero.mutate.message.insert({
            id: randomID(),
            channelID: channel.id,
            threadID: thread?.id,
            isThreadReply: !!thread,
            content,
            deleted: false,
            creatorID: user!.id,
            serverID: server.id,
          })

          setTimeout(() => {
            inputRef.current?.textarea?.focus()
          }, 40)
        }}
      />

      <MessageInputAttachments />
    </YStack>
  )
}

const MessageInputAttachments = () => {
  const [attachments, setAttachments] = useState<FileUpload[]>([])

  attachmentEmitter.use((value) => {
    console.warn('got attachment', value)
    setAttachments(value)
  })

  return (
    <XStack gap="$2">
      {attachments.map((attachment) => {
        const url = attachment.url || attachment.preview
        const size = 50

        return (
          <YStack key={attachment.name} gap="$1" w={size} h={size}>
            {url && (
              <YStack pos="relative">
                <Button
                  circular
                  icon={X}
                  size="$1"
                  pos="absolute"
                  t={-2}
                  r={-2}
                  zi={10}
                  onPress={() => {
                    setAttachments((prev) => {
                      return prev.filter((_) => _.name !== attachment.name)
                    })
                  }}
                />
                <Image
                  src={url}
                  br="$6"
                  ov="hidden"
                  bw={1}
                  bc="$color3"
                  width={size}
                  height={size}
                  objectFit="contain"
                />
              </YStack>
            )}
            {attachment.progress !== 100 && (
              <Progress
                pos="absolute"
                b={0}
                l={0}
                r={0}
                w={size}
                miw={size}
                h={5}
                zi={100}
                value={attachment.progress}
                bg="$color2"
              >
                <Progress.Indicator h={5} bc="$color7" animation="bouncy" />
              </Progress>
            )}
          </YStack>
        )
      })}
    </XStack>
  )
}
