import { createSchema, type Row } from '@rocicorp/zero'
import { allRelationships, allTables } from './tables'

export const schema = createSchema(1, {
  tables: allTables,
  relationships: allRelationships,
})

export type Schema = typeof schema

export type TableNames = keyof Schema['tables']

export type Attachment = Row<Schema['tables']['attachment']>
export type Message = Row<Schema['tables']['message']>
export type Server = Row<Schema['tables']['server']>
export type Channel = Row<Schema['tables']['channel']>
export type Thread = Row<Schema['tables']['thread']>
export type User = Row<Schema['tables']['user']>
export type ServerMember = Row<Schema['tables']['serverMember']>
export type MessageReaction = Row<Schema['tables']['messageReaction']>
export type Reaction = Row<Schema['tables']['reaction']>
export type Friendship = Row<Schema['tables']['friendship']>
export type Role = Row<Schema['tables']['role']>
export type UserRole = Row<Schema['tables']['userRole']>
export type ChannelPermission = Row<Schema['tables']['channelPermission']>

const rolePermissionsKeys = ['canAdmin', 'canEditChannel', 'canEditServer'] satisfies (keyof Role)[]
export type RolePermissionsKeys = (typeof rolePermissionsKeys)[number]

export type MessageWithRelations = Message & {
  channel?: Channel
  reactions: readonly Reaction[]
  thread?: Thread
  sender?: User
  replyingTo?: Message & { sender?: User }
  attachments: readonly Attachment[]
}

export type ThreadWithRelations = Thread & { messages: readonly Message[] }
export type RoleWithRelations = Role & { members: readonly User[] }
