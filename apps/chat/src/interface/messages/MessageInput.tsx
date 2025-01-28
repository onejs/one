import { useEffect, useRef, useState } from 'react'
import { Progress, XStack, YStack } from 'tamagui'
import { useAuth } from '~/better-auth/authClient'
import { Editor, type EditorRef } from '~/editor/Editor'
import { randomId } from '~/helpers/randomId'
import { handleKeyboardEscape } from '~/keyboard/handleKeyboardEscape'
import { useCurrentChannel } from '~/state/channel/useCurrentChannel'
import { useCurrentThreadWithMessages } from '~/state/message/useCurrentThread'
import { useCurrentServer } from '~/state/server/useCurrentServer'
import { closeCurrentThread, getCurrentUser, getDerivedUserState } from '~/state/user'
import { type Attachment, zero } from '~/zero'
import { getSessionState, updateSessionState } from '../../state/session'
import { AttachmentItem } from '../attachments/AttachmentItem'
import { dialogEmitter } from '../dialogs/shared'
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
  const thread = useCurrentThreadWithMessages()
  const { user } = useAuth()
  // const disabled = !user || !channel

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

  dialogEmitter.use((value) => {
    if (value.type === 'closed') {
      setTimeout(() => {
        mainInputRef?.textarea?.focus()
      })
    }
  })

  messageInputEmitter.use((value) => {
    if (value.type === 'focus') {
      setTimeout(() => {
        mainInputRef?.textarea?.focus()
      })
    }
  })

  return (
    <YStack overflow="hidden" maxH="100%" p="$2" rounded="$4" gap="$2">
      <MessageInputReply />

      <Editor
        ref={inputRef}
        onKeyUp={(e) => {
          const key = e.key
          const text = inputRef.current?.textarea?.['value'] as string

          // if we opened hot menu by typing, close it when cleared
          if (!text && getSessionState().showHotMenu === 'from-input') {
            updateSessionState({
              showHotMenu: false,
            })
          }

          switch (key) {
            case '/': {
              if (text[0] === '/') {
                updateSessionState({
                  showHotMenu: 'from-input',
                })
              }
              break
            }
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
              if (handleKeyboardEscape()) {
                return
              }

              inputRef.current?.textarea?.blur()

              if (getDerivedUserState().activeThread) {
                closeCurrentThread()

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
            const messageId = randomId()

            const messageState = messageReplyEmitter.value
            const replyingToId = messageState?.type === 'reply' ? messageState.messageId : null

            tx.message.insert({
              id: messageId,
              channelId: channel.id,
              threadId: thread?.id,
              isThreadReply: !!thread,
              replyingToId,
              content,
              deleted: false,
              creatorId: user!.id,
              serverId: server.id,
            })

            const attachments = attachmentEmitter.value
            if (attachments) {
              for (const attachment of attachments) {
                tx.attachment.insert({
                  id: randomId(),
                  type: attachment.type,
                  userId: user.id,
                  channelId: channel.id,
                  url: attachment.url,
                  messageId,
                })
              }
            }
          })

          messageInputEmitter.emit({ type: 'submit' })
          messageReplyEmitter.emit({ type: 'cancel' })
          messagesListEmitter.emit({ type: 'scroll-to-bottom' })

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
    channelId: null,
    messageId: null,
    userId: getCurrentUser()?.id || `no-user`,
    createdAt: null,
    data: null,
    id: upload.name || randomId(),
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
          <YStack key={attachment.id} gap="$1" width={size} height={size}>
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
                position="absolute"
                b={0}
                l={0}
                r={0}
                width={size}
                minW={size}
                height={5}
                z={100}
                value={upload.progress}
                bg="$color2"
              >
                <Progress.Indicator height={5} borderColor="$color7" animation="bouncy" />
              </Progress>
            )}
          </YStack>
        )
      })}
    </XStack>
  )
}
