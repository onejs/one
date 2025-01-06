import type { InferInsertModel, InferSelectModel, One, Relation, Relations } from 'drizzle-orm'
import type { PgTable } from 'drizzle-orm/pg-core'
import * as schema from './publicSchema'

export type { UserState, ChannelState } from './publicSchema'

const rolePermissionsKeys = ['canAdmin', 'canEditChannel', 'canEditServer'] satisfies (keyof Role)[]
export type RolePermissionsKeys = (typeof rolePermissionsKeys)[0]

type ExtractTables<T> = {
  [K in keyof T]: T[K] extends PgTable ? T[K] : never
}

type ExtractRelations<T> = {
  [K in keyof T]: T[K] extends Relations ? T[K] : never
}

type DrizzleRowToZeroRow<R extends Record<string, any>> = {
  [Key in keyof R]: R[Key] extends Date | null | undefined ? number | null | undefined : R[Key]
}

// Extract only the tables from the schema
type SchemaTables = ExtractTables<typeof schema>

export function createSchemaTypes<Schema extends Record<string, any>>(_tables: Schema) {
  type Tables = ExtractTables<Schema>
  type ExtractedRelations = ExtractRelations<Schema>

  type InsertTypes = {
    [K in keyof Tables]: DrizzleRowToZeroRow<InferInsertModel<Tables[K]>>
  }

  type SelectTypes = {
    [K in keyof Tables]: InferSelectModel<Tables[K]>
  }

  type RelationsCol<A extends string> = `${A}Relations`

  type TableRelations<Row, R extends Relations> = R extends Relations<any, infer X>
    ? Row & {
        [RK in keyof X]: X[RK] extends One ? Row | undefined : Row[] | undefined
      }
    : never

  type RelationTypes = {
    [K in keyof Tables]: K extends string
      ? RelationsCol<K> extends keyof ExtractedRelations
        ? TableRelations<SelectTypes[K], ExtractedRelations[RelationsCol<K>]>
        : never
      : never
  }

  return {
    Insert: {} as InsertTypes,
    Select: {} as SelectTypes,
    WithRelations: {} as RelationTypes,
  }
}

const schemaTypes = createSchemaTypes<typeof schema>(schema as SchemaTables)

export type Schema = typeof schemaTypes

// Example type exports
export type User = Schema['Insert']['user']
export type UserWithRelations = Schema['WithRelations']['user']

export type Attachment = Schema['Insert']['attachment']
export type AttachmentWithRelations = Schema['WithRelations']['attachment']

export type Message = Schema['Insert']['message']
export type MessageWithRelations = Schema['WithRelations']['message']

export type Server = Schema['Insert']['server']
export type ServerWithRelations = Schema['WithRelations']['server']

export type Channel = Schema['Insert']['channel']
export type ChannelWithRelations = Schema['WithRelations']['channel']

export type Thread = Schema['Insert']['thread']
export type ThreadWithRelations = Schema['WithRelations']['thread']

export type ServerMember = Schema['Insert']['serverMember']
export type ServerMemberWithRelations = Schema['WithRelations']['serverMember']

export type MessageReaction = Schema['Insert']['messageReaction']
export type MessageReactionWithRelations = Schema['WithRelations']['messageReaction']

export type Reaction = Schema['Insert']['reaction']
export type ReactionWithRelations = Schema['WithRelations']['reaction']

export type Friendship = Schema['Insert']['friendship']
export type FriendshipWithRelations = Schema['WithRelations']['friendship']

export type Role = Schema['Insert']['role']
export type RoleWithRelations = Schema['WithRelations']['role']

export type UserRole = Schema['Insert']['userRole']
export type UserRoleWithRelations = Schema['WithRelations']['userRole']

export type ChannelPermission = Schema['Insert']['channelPermission']
export type ChannelPermissionWithRelations = Schema['WithRelations']['channelPermission']
