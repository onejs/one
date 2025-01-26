import { ensureSignedUp } from '~/interface/dialogs/actions'
import type { Server } from '~/zero'
import { randomId } from '~/helpers/randomId'
import { zero } from '~/zero/zero'
import { updateUserState } from '~/state/user'
import type { JSONValue } from '@rocicorp/zero'

export const mutateInsertServer = async (server: Partial<Server>) => {
  const currentUser = await ensureSignedUp()
  const serverId = randomId()
  const channelId = randomId()
  const roleId = randomId()

  await zero.mutateBatch((tx) => {
    const { createdAt, ...rest } = server
    tx.server.insert({
      id: serverId,
      description: '',
      icon: Math.random() > 0.5 ? 'red' : 'pink',
      name: 'Lorem',
      creatorId: currentUser.id,
      channelSort: [channelId],
      createdAt: Number(createdAt),
      ...rest,
    })

    console.warn('insert role', roleId)
    tx.role.insert({
      id: roleId,
      color: '#ccc',
      creatorId: currentUser.id,
      name: 'Admin',
      canAdmin: true,
      serverId,
    })

    console.warn('insert user role for', currentUser.id)
    tx.userRole.insert({
      granterId: currentUser.id,
      roleId,
      serverId,
      userId: currentUser.id,
    })

    tx.serverMember.insert({
      serverId,
      userId: currentUser.id,
    })

    tx.channel.insert({
      id: channelId,
      description: '',
      name: 'Welcome',
      private: false,
      serverId,
    })
  })

  updateUserState({
    activeServer: serverId,
  })
}
