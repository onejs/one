import type { Server } from '~/zero/schema'
import { currentUser, updateUserState } from './user'
import { randomID } from '../helpers/randomID'
import { mutate } from './zero'

export const insertServer = async (server: Partial<Server>) => {
  if (!currentUser) {
    console.error('not signed in')
    return
  }

  const serverId = randomID()
  const channelId = randomID()

  await mutate.server.insert({
    id: serverId,
    createdAt: new Date().getTime(),
    description: '',
    icon: Math.random() > 0.5 ? 'red' : 'pink',
    name: 'Lorem',
    ownerId: currentUser.id,
    channelSort: [channelId],
    ...server,
  })

  await mutate.serverMember.insert({
    joinedAt: new Date().getTime(),
    serverId,
    userId: currentUser.id,
  })

  await mutate.channel.insert({
    id: channelId,
    createdAt: new Date().getTime(),
    description: '',
    name: 'Welcome',
    private: false,
    serverId,
  })

  updateUserState({
    activeServer: serverId,
  })
}
