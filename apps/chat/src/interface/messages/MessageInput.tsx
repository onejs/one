import type { RefMDEditor } from '@uiw/react-md-editor'
import { useEffect, useRef } from 'react'
import { Input, YStack } from 'tamagui'
import { useAuth } from '~/better-auth/authClient'
import { Editor, type EditorRef } from '~/editor/Editor'
import { randomID } from '~/helpers/randomID'
import { useCurrentChannel, useCurrentServer } from '~/state/server'
import { getDerivedUserState, updateUserCurrentChannel, useCurrentThread } from '~/state/user'
import { zero } from '~/zero/zero'
import { messagesListEmitter } from './MessagesList'

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
    <YStack btw={1} bc="$color4" p="$2">
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

          inputRef.current?.cl

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

          // setTimeout(() => {
          //   inputRef.current?.focus()
          // }, 40)
        }}
      />
    </YStack>
  )
}
