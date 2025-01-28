import { useEffect, useRef, useState } from 'react'
import { Dialog, Input, YStack } from 'tamagui'
import { useQuery } from '~/zero'
import { UserRowFriendable } from '../users/UserRow'
import { addFriendEmitter } from './actions'
import { DialogContent, DialogOverlay, useDialogEmit } from './shared'

const success = () => addFriendEmitter.emit(true)
const cancel = () => addFriendEmitter.emit(false)

export const DialogAddFriend = () => {
  const [show, setShow] = useState(false)
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [foundUsers] = useQuery((q) =>
    q.user.where('username', 'ILIKE', `%${search}%`).limit(!search ? 0 : 10)
  )

  useDialogEmit((next) => {
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
          <Input onChangeText={setSearch} ref={inputRef as any} flex={1} size="$5" />
          <YStack flex={100}>
            {foundUsers.map((user) => {
              return <UserRowFriendable key={user.id} user={user} />
            })}
          </YStack>
        </DialogContent>
      </Dialog.Portal>
    </Dialog>
  )
}
