import { ensureSignedUp } from '~/interface/dialogs/actions'
import type { Server } from '~/zero/schema'
import { randomID } from '../helpers/randomID'
import { mutate, zero } from '../zero/zero'
import { updateUserState } from './user'

export const insertServer = async (server: Partial<Server>) => {
  const currentUser = await ensureSignedUp()
  const serverId = randomID()
  const channelId = randomID()
  const roleId = randomID()

  await zero.mutateBatch((tx) => {
    tx.server.insert({
      id: serverId,
      description: '',
      icon: Math.random() > 0.5 ? 'red' : 'pink',
      name: 'Lorem',
      ownerId: currentUser.id,
      channelSort: [channelId],
      ...server,
    })

    tx.role.insert({
      id: roleId,
      color: '#ccc',
      creatorId: currentUser.id,
      name: 'Admin',
      canAdmin: true,
      serverId,
    })

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
