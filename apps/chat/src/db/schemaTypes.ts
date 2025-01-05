import type { InferInsertModel, InferSelectModel } from 'drizzle-orm'
import type { PgTable } from 'drizzle-orm/pg-core'
import * as schema from './publicSchema'

// Helper to extract only PgTable types from the schema
type ExtractTables<T> = {
  [K in keyof T as T[K] extends PgTable ? K : never]: T[K]
}

// Extract only the tables from the schema
type SchemaTables = ExtractTables<typeof schema>

export function createSchemaTypes<Tables extends Record<string, PgTable>>(_tables: Tables) {
  type InsertTypes = {
    [K in keyof Tables]: InferInsertModel<Tables[K]>
  }

  type SelectTypes = {
    [K in keyof Tables]: InferSelectModel<Tables[K]>
  }

  type RelationTypes = {
    [K in keyof Tables]: SelectTypes[K] & {
      [RelationKey in keyof Tables as `${string & RelationKey}`]?: SelectTypes[RelationKey]
    }
  }

  return {
    Insert: {} as InsertTypes,
    Select: {} as SelectTypes,
    Relations: {} as RelationTypes,
  }
}

// Create schema types using only the tables (excluding relations)
const schemaTypes = createSchemaTypes<SchemaTables>(schema as SchemaTables)

export type Schema = typeof schemaTypes

// Example type exports
export type User = Schema['Insert']['user']
export type UserWithRelations = Schema['Relations']['user']

export type Attachment = Schema['Insert']['attachment']
export type AttachmentWithRelations = Schema['Relations']['attachment']

export type Message = Schema['Insert']['message']
export type MessageWithRelations = Schema['Relations']['message']

export type Server = Schema['Insert']['server']
export type ServerWithRelations = Schema['Relations']['server']

export type Channel = Schema['Insert']['channel']
export type ChannelWithRelations = Schema['Relations']['channel']

export type Thread = Schema['Insert']['thread']
export type ThreadWithRelations = Schema['Relations']['thread']

export type ServerMember = Schema['Insert']['serverMember']
export type ServerMemberWithRelations = Schema['Relations']['serverMember']

export type MessageReaction = Schema['Insert']['messageReaction']
export type MessageReactionWithRelations = Schema['Relations']['messageReaction']

export type Reaction = Schema['Insert']['reaction']
export type ReactionWithRelations = Schema['Relations']['reaction']

export type Friendship = Schema['Insert']['friendship']
export type FriendshipWithRelations = Schema['Relations']['friendship']

export type Role = Schema['Insert']['role']
export type RoleWithRelations = Schema['Relations']['role']

export type UserRole = Schema['Insert']['userRole']
export type UserRoleWithRelations = Schema['Relations']['userRole']

export type ChannelPermission = Schema['Insert']['channelPermission']
export type ChannelPermissionWithRelations = Schema['Relations']['channelPermission']
