import { useEffect, useRef } from 'react'
import { Input, YStack } from 'tamagui'
import { useAuth } from '~/better-auth/authClient'
import { useCurrentChannel, useCurrentServer } from '~/state/server'
import { getDerivedUserState, updateUserCurrentChannel, useCurrentThread } from '~/state/user'
import { randomID } from '~/helpers/randomID'
import { mutate } from '~/zero/zero'
import { messagesListEmitter } from './MessagesList'
import { Editor } from '~/editor/Editor'

let mainInputRef: Input | null = null

export const MessageInput = ({ inThread }: { inThread?: boolean }) => {
  const inputRef = useRef<Input>(null)
  const channel = useCurrentChannel()
  const server = useCurrentServer()
  const thread = useCurrentThread()
  const { user } = useAuth()
  const disabled = !user

  // on channel change, focus input
  useEffect(() => {
    if (!inThread) {
      mainInputRef = inputRef.current
    }

    inputRef.current?.focus()
  }, [channel, inThread])

  return (
    <YStack btw={1} bc="$color4" p="$2">
      <Editor
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
              inputRef.current?.blur()

              if (getDerivedUserState().activeThread) {
                updateUserCurrentChannel({
                  openedThreadId: undefined,
                })

                if (mainInputRef) {
                  mainInputRef.focus()
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

          inputRef.current?.clear()
          mutate.message.insert({
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

  return (
    <YStack btw={1} bc="$color4" p="$2">
      <Input
        ref={inputRef}
        disabled={disabled}
        placeholder={disabled ? 'Sign in to chat...' : ''}
        pe={disabled ? 'none' : 'auto'}
        onSubmitEditing={(e) => {}}
      />
    </YStack>
  )
}
