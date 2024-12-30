import { useEffect, useRef, useState } from 'react'
import { Progress, XStack, YStack } from 'tamagui'
import { useAuth } from '~/better-auth/authClient'
import { Editor, type EditorRef } from '~/editor/Editor'
import { randomID } from '~/helpers/randomID'
import { useCurrentChannel, useCurrentServer } from '~/state/server'
import {
  getCurrentUser,
  getDerivedUserState,
  updateUserCurrentChannel,
  useCurrentThread,
} from '~/state/user'
import { type Attachment, zero } from '~/zero'
import { AttachmentItem } from '../attachments/AttachmentItem'
import { attachmentEmitter } from '../upload/DragDropFile'
import type { FileUpload } from '../upload/uploadImage'
import { messageInputEmitter, messageReplyEmitter } from './emitters'
import { MessageInputReply } from './MessageInputReply'
import { messagesListEmitter } from './MessagesList'

let mainInputRef: EditorRef | null = null

export const MessageInput = ({ inThread }: { inThread?: boolean }) => {
  const inputRef = useRef<EditorRef>(null)
  const channel = useCurrentChannel()
  const server = useCurrentServer()
  const thread = useCurrentThread()
  const { user } = useAuth()
  const disabled = !user || !channel

  // on channel change, focus input
  useEffect(() => {
    if (!inThread) {
      if (!mainInputRef) {
        setTimeout(() => {
          mainInputRef = inputRef.current
          mainInputRef?.textarea?.focus()
        })
      }
    }

    setTimeout(() => {
      inputRef.current?.textarea?.focus()
    })

    return () => {
      // focus events cause layout shifts which can make animations bad
      setTimeout(() => {
        mainInputRef?.textarea?.focus()
      }, 50)
    }
  }, [channel, inThread])

  messageInputEmitter.use((value) => {
    if (value.type === 'focus') {
      setTimeout(() => {
        mainInputRef?.textarea?.focus()
      })
    }
  })

  return (
    <YStack
      btw={1}
      bc="$color4"
      p="$2"
      gap="$2"
      {...(disabled && {
        opacity: 0.5,
        pointerEvents: 'none',
      })}
    >
      <MessageInputReply />

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
              if (messageReplyEmitter.value?.type === 'reply') {
                messageReplyEmitter.emit({ type: 'cancel' })
                return
              }

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
        onSubmit={async (content) => {
          if (!user || !channel) {
            console.warn('missing', { user, channel })
            return
          }
          if (!content) {
            return
          }

          inputRef.current?.clear?.()

          await zero.mutateBatch((tx) => {
            const messageID = randomID()

            tx.message.insert({
              id: messageID,
              channelID: channel.id,
              threadID: thread?.id,
              isThreadReply: !!thread,
              content,
              deleted: false,
              creatorID: user!.id,
              serverID: server.id,
            })

            const attachments = attachmentEmitter.value
            if (attachments) {
              for (const attachment of attachments) {
                tx.attachment.insert({
                  id: randomID(),
                  type: attachment.type,
                  userID: user.id,
                  channelID: channel.id,
                  url: attachment.url,
                  messageID,
                })
              }
            }
          })

          messageInputEmitter.emit({ type: 'submit' })

          setTimeout(() => {
            inputRef.current?.textarea?.focus()
          }, 40)
        }}
      />

      <MessageInputAttachments />
    </YStack>
  )
}

const fileUploadToAttachment = (upload: FileUpload): Attachment => {
  return {
    channelID: null,
    messageID: null,
    userID: getCurrentUser()?.id || `no-user`,
    createdAt: null,
    data: null,
    id: upload.name || randomID(),
    url: upload.url || upload.preview || null,
    type: upload.type,
  }
}

const MessageInputAttachments = () => {
  const [uploads, setUploads] = useState<FileUpload[]>([])

  attachmentEmitter.use((uploads) => {
    setUploads(uploads)
  })

  messageInputEmitter.use((value) => {
    if (value.type === 'submit') {
      setUploads([])
      attachmentEmitter.emit([])
    }
  })

  return (
    <XStack gap="$2">
      {uploads.map((upload) => {
        const attachment = fileUploadToAttachment(upload)
        const size = 60

        return (
          <YStack key={attachment.id} gap="$1" w={size} h={size}>
            {attachment.url && (
              <AttachmentItem
                attachment={attachment}
                size={size}
                editable
                rounded
                onDelete={() => {
                  setUploads((prev) => {
                    return prev.filter((_) => _.name !== upload.name)
                  })
                }}
              ></AttachmentItem>
            )}
            {upload.progress !== 100 && (
              <Progress
                pos="absolute"
                b={0}
                l={0}
                r={0}
                w={size}
                miw={size}
                h={5}
                zi={100}
                value={upload.progress}
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
