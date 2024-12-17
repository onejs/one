import { UserCheck, UserPlus, UserX } from '@tamagui/lucide-icons'
import { useEffect, useRef, useState } from 'react'
import { Button, Dialog, Input, SizableText, TooltipSimple, XStack, YStack } from 'tamagui'
import { Friendship, User } from '~/config/zero/schema'
import { useAuth } from '~/features/auth/useAuth'
import { mutate, useQuery } from '~/features/state/zero'
import { createEmitter } from '~/helpers/emitter'
import { Avatar } from '../Avatar'
import { DialogContent, dialogEmitter, DialogOverlay, useDialogEmitter } from './shared'
import { Row } from '../Row'
import { dialogConfirm } from './DialogConfirm'

const [dialogCreateServerEmitter] = createEmitter<boolean>()

export const dialogAddFriend = async () => {
  dialogEmitter.emit({
    type: 'add-friend',
  })

  return new Promise((res) => {
    const dispose = dialogCreateServerEmitter.listen((val) => {
      dispose()
      res(val)
    })
  })
}

const success = () => dialogCreateServerEmitter.emit(true)
const cancel = () => dialogCreateServerEmitter.emit(false)

export const DialogAddFriend = () => {
  const [show, setShow] = useState(false)
  const [search, setSearch] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)
  const [foundUsers] = useQuery((q) =>
    q.user.where('username', 'ILIKE', `%${search}%`).limit(!search ? 0 : 10)
  )

  useDialogEmitter((next) => {
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
          <Input onChangeText={setSearch} ref={inputRef as any} f={1} size="$5" />
          <YStack f={100}>
            {foundUsers.map((user) => {
              return <UserRow key={user.id} user={user} />
            })}
          </YStack>
        </DialogContent>
      </Dialog.Portal>
    </Dialog>
  )
}

type FriendshipStatus = 'not-friend' | 'requested' | 'accepted'

export const useFriendship = (userA: { id: string }, userB?: { id: string } | null) => {
  const [friendships] = useQuery((q) =>
    q.friendship.where('requestingId', userA.id).where('acceptingId', userB?.id || '')
  )
  const [friendship] = friendships
  const status = !friendship ? 'not-friend' : !friendship.accepted ? 'requested' : 'accepted'
  return [friendship, status] as const
}

const removeFriendship = async (friendship: Friendship) => {
  await Promise.all([
    mutate.friendship.delete(friendship),
    // delete the opposite one too
    mutate.friendship.delete({
      requestingId: friendship.acceptingId,
      acceptingId: friendship.requestingId,
    }),
  ])
}

const UserRow = ({ user }: { user: User }) => {
  const { user: currentUser } = useAuth()
  const [friendship, status] = useFriendship(user, currentUser)

  return (
    <Row>
      <Avatar image={user.image} />
      <Row.Text>{user.username || user.name}</Row.Text>
      <XStack f={1} />
      <TooltipSimple
        label={
          status === 'accepted' ? 'Friends' : status === 'not-friend' ? 'Add friend' : 'Requested'
        }
      >
        <Row.Button
          icon={friendRequestIcons[status]}
          theme={status === 'requested' ? 'yellow' : status === 'accepted' ? 'green' : null}
          onPress={async () => {
            if (!currentUser) return

            if (friendship) {
              if (friendship.accepted) {
                // confirm delete if already accepted
                if (
                  await dialogConfirm({
                    title: `Remove friend?`,
                    description: '',
                  })
                ) {
                  removeFriendship(friendship)
                } else {
                  return
                }
              }

              // if not already accepted just toggle immediately
              removeFriendship(friendship)
              return
            }

            mutate.friendship.insert({
              accepted: false,
              acceptingId: currentUser.id,
              requestingId: user.id,
              createdAt: new Date().getTime(),
            })
            mutate.friendship.insert({
              accepted: false,
              acceptingId: user.id,
              requestingId: currentUser.id,
              createdAt: new Date().getTime(),
            })
          }}
        ></Row.Button>
      </TooltipSimple>
    </Row>
  )
}

const friendRequestIcons: Record<FriendshipStatus, any> = {
  'not-friend': UserPlus,
  accepted: UserCheck,
  requested: UserX,
}
