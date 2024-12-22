import { ensureSignedUp } from '~/interface/dialogs/actions'
import type { Server } from '~/zero/schema'
import { randomID } from '../helpers/randomID'
import { mutate, zero } from '../zero/zero'
import { updateUserState } from './user'

export const insertServer = async (server: Partial<Server>) => {
  const currentUser = await ensureSignedUp()
  const serverID = randomID()
  const channelID = randomID()
  const roleID = randomID()

  await zero.mutateBatch((tx) => {
    tx.server.insert({
      id: serverID,
      description: '',
      icon: Math.random() > 0.5 ? 'red' : 'pink',
      name: 'Lorem',
      creatorID: currentUser.id,
      channelSort: [channelID],
      ...server,
    })

    tx.role.insert({
      id: roleID,
      color: '#ccc',
      creatorID: currentUser.id,
      name: 'Admin',
      canAdmin: true,
      serverID,
    })

    tx.userRole.insert({
      granterID: currentUser.id,
      roleID,
      serverID,
      userID: currentUser.id,
    })

    tx.serverMember.insert({
      serverID,
      userID: currentUser.id,
    })

    tx.channel.insert({
      id: channelID,
      description: '',
      name: 'Welcome',
      private: false,
      serverID,
    })
  })

  updateUserState({
    activeServer: serverID,
  })
}
