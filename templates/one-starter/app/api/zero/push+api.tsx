import { getAuthDataFromRequest } from '@o/better-auth-utils/server'
import { handleMutateRequest } from '@rocicorp/zero/server'
import type { Endpoint } from 'one'
import { authServer } from '~/features/auth/server/authServer'
import { zeroBindings, zeroDatabase } from '~/zero/server'
export const POST: Endpoint = async (request) => {
  const authData = await getAuthDataFromRequest(authServer, request)
  const result = await handleMutateRequest({
    dbProvider: zeroDatabase,
    request,
    userID: authData?.id,
    handler: async (transact) => {
      const effects: Array<() => void | Promise<void>> = []
      const result = await transact(async (tx, name, args) => {
        const mutator = zeroBindings.mutators[name]
        if (!mutator) throw new Error(`Unknown mutation: ${name}`)
        await mutator({
          tx: tx as unknown as Parameters<typeof mutator>[0]['tx'],
          args: (args ?? null) as Parameters<typeof mutator>[0]['args'],
          ctx: {
            claims: {
              userID: authData?.id ?? 'anon',
              authData: (authData ?? null) as unknown as Parameters<
                typeof mutator
              >[0]['args'],
            },
            defer: (effect) => effects.push(effect),
          },
        })
      })
      if (!('error' in result.result)) {
        const settled = await Promise.allSettled(effects.map((effect) => effect()))
        for (const effect of settled) {
          if (effect.status === 'rejected') {
            console.error('[zero] background task failed', effect.reason)
          }
        }
      }
      return result
    },
  })
  return Response.json(result)
}
