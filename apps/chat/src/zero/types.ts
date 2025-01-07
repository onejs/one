import type { Row, TableSchema } from '@rocicorp/zero'
import type { Tables } from '~/zero'
export type { ChannelState, UserState } from '~/db/publicSchema'

const rolePermissionsKeys = ['canAdmin', 'canEditChannel', 'canEditServer'] satisfies (keyof Role)[]

type RowWithRelations<
  Tables extends Record<string, TableSchema>,
  TableName extends keyof Tables,
  Table extends Tables[TableName] = Tables[TableName],
> = Row<Table> & {
  [RelationTableName in keyof Table['relationships']]?: RelationTableName extends keyof Tables
    ? Row<Tables[RelationTableName]>
    : never
}

export type User = Row<Tables['user']>
export type UserWithRelations = RowWithRelations<Tables, 'user'>

export type Attachment = Row<Tables['attachment']>
export type AttachmentWithRelations = RowWithRelations<Tables, 'attachment'>

export type Message = Row<Tables['message']>
export type MessageWithRelations = RowWithRelations<Tables, 'message'>

export type Server = Row<Tables['server']>
export type ServerWithRelations = RowWithRelations<Tables, 'server'>

export type Channel = Row<Tables['channel']>
export type ChannelWithRelations = RowWithRelations<Tables, 'channel'>

export type Thread = Row<Tables['thread']>
export type ThreadWithRelations = RowWithRelations<Tables, 'thread'>

export type ServerMember = Row<Tables['serverMember']>
export type ServerMemberWithRelations = RowWithRelations<Tables, 'serverMember'>

export type MessageReaction = Row<Tables['messageReaction']>
export type MessageReactionWithRelations = RowWithRelations<Tables, 'messageReaction'>

export type Reaction = Row<Tables['reaction']>
export type ReactionWithRelations = RowWithRelations<Tables, 'reaction'>

export type Friendship = Row<Tables['friendship']>
export type FriendshipWithRelations = RowWithRelations<Tables, 'friendship'>

export type Role = Row<Tables['role']>
export type RoleWithRelations = RowWithRelations<Tables, 'role'>

export type UserRole = Row<Tables['userRole']>
export type UserRoleWithRelations = RowWithRelations<Tables, 'userRole'>

export type ChannelPermission = Row<Tables['channelPermission']>
export type ChannelPermissionWithRelations = RowWithRelations<Tables, 'channelPermission'>
