import { UserCheck, UserPlus, UserX } from '@tamagui/lucide-icons'
import { TooltipSimple, XStack } from 'tamagui'
import { useAuth } from '~/better-auth/authClient'
import type { Friendship, User } from '~/zero'
import { useQuery, zero } from '~/zero'
import { Avatar } from '../Avatar'
import { Row, type RowProps } from '../Row'
import { dialogConfirm } from '../dialogs/actions'

export const UserRow = ({
  user,
  action,
  active,
  rowProps,
}: { user: User; action?: any; rowProps?: RowProps; active?: boolean }) => {
  return (
    <Row active={active} {...rowProps}>
      <Avatar image={user.image} />
      <Row.Text>{user.username || user.name}</Row.Text>
      <XStack f={1} />
      {action}
    </Row>
  )
}

type FriendshipStatus = 'not-friend' | 'requested' | 'accepted'

export const useFriendship = (userA: { id: string }, userB?: { id: string } | null) => {
  const [friendships] = useQuery((q) =>
    q.friendship.where('requestingID', userA.id).where('acceptingID', userB?.id || '')
  )
  const [friendship] = friendships
  const status = !friendship ? 'not-friend' : !friendship.accepted ? 'requested' : 'accepted'
  return [friendship, status] as const
}

const removeFriendship = async (friendship: Friendship) => {
  await Promise.all([
    zero.mutate.friendship.delete(friendship),
    // delete the opposite one too
    zero.mutate.friendship.delete({
      requestingID: friendship.acceptingID,
      acceptingID: friendship.requestingID,
    }),
  ])
}

export const UserRowFriendable = ({ user }: { user: User }) => {
  const { user: currentUser } = useAuth()
  const [friendship, status] = useFriendship(user, currentUser)

  return (
    <UserRow
      user={user}
      action={
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

              zero.mutate.friendship.insert({
                accepted: false,
                acceptingID: currentUser.id,
                requestingID: user.id,
              })
              zero.mutate.friendship.insert({
                accepted: false,
                acceptingID: user.id,
                requestingID: currentUser.id,
              })
            }}
          ></Row.Button>
        </TooltipSimple>
      }
    />
  )
}

const friendRequestIcons: Record<FriendshipStatus, any> = {
  'not-friend': UserPlus,
  accepted: UserCheck,
  requested: UserX,
}
