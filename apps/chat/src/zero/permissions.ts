import {
  definePermissions,
  type ExpressionBuilder,
  NOBODY_CAN,
  type TableSchema,
} from '@rocicorp/zero'
import { type Schema, schema, Tables } from './schema'
import type { AuthData } from '~/db/types'

// type PermissionQuery<Condition = any> = (ad: AuthData, eb: ExpressionBuilder<any>) => Condition

type PermissionsQueries = typeof permissionQueries
type PermissionsTables = keyof PermissionsQueries
type PermissionsKeys<Key extends PermissionsTables = PermissionsTables> =
  `${Key}.${keyof PermissionsQueries[Key] extends string ? keyof PermissionsQueries[Key] : never}`

export function usePermission(permission: PermissionsKeys) {
  // const { user } = useAuth()
  // const [tableName, operationName] = permission.split('.')
  // // @ts-ignore
  // const permissionQuery = permissionQueries[tableName]?.[operationName]
  // return useQuery(q => {
  //   const tableQuery = q[tableName]
  //   const eb = new ExpressionBuilder()
  // })
}

usePermission('channel.insert')

const canEditChannel = (ad: AuthData, eb: ExpressionBuilder<Tables['channel']>) => {
  return eb.exists('server', (server) => {
    return server.whereExists('roles', (q) =>
      q.where('canAdmin', true).whereExists('members', (q) => q.where('id', ad.id))
    )
  })
}

const userIsLoggedIn = (authData: AuthData, { cmpLit }: ExpressionBuilder<TableSchema>) => {
  return cmpLit(authData.id, 'IS NOT', null)
}

export const permissionQueries = {
  user: {
    insert: NOBODY_CAN,
    delete: NOBODY_CAN,
  },

  server: {
    insert: [userIsLoggedIn],
    update: [
      (ad: AuthData, eb: ExpressionBuilder<Tables['server']>) => {
        return eb.or(
          eb.exists('roles', (q) =>
            q.where('canAdmin', true).whereExists('members', (q) => q.where('id', ad.id))
          ),
          eb.exists('roles', (q) =>
            q.where('canEditServer', true).whereExists('members', (q) => q.where('id', ad.id))
          )
        )
      },
    ],
  },

  channel: {
    insert: [canEditChannel],
    update: [canEditChannel],
  },
} satisfies Record<
  string,
  {
    insert?: any[]
    update?: any[]
    afterUpdate?: any[]
    delete?: any[]
    select?: any[]
  }
>

export const permissions = definePermissions<AuthData, Schema>(schema, () => {
  const out = {} as any

  for (const key in permissionQueries) {
    // @ts-expect-error
    const query = permissionQueries[key]

    out[key] = {
      row: {},
    }
    const target = out[key].row

    if (query.insert) {
      target.insert = query.insert
    }
    if (query.select) {
      target.select = query.select
    }
    if (query.delete) {
      target.delete = query.delete
    }
    if (query.update) {
      target.update ||= {}
      target.update.preMutation = query.update
    }
    if (query.afterUpdate) {
      target.update ||= {}
      target.update.postMutation = query.afterUpdate
    }
  }

  console.info(`Build permissions:`, out)

  return out
})
