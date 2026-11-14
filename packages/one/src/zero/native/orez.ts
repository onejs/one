import type {
  ClientState,
  DesiredQuery,
  JSONValue,
  Mutation,
  PullResponse,
  Transport,
} from './types'

export type OrezTransportOptions = {
  server: string
  appID: string
  schemaVersion: string
  shardNum?: number
  headers?: () => Record<string, string> | Promise<Record<string, string>>
  fetch?: typeof fetch
}

export function createOrezTransport(options: OrezTransportOptions): Transport {
  const server = options.server.replace(/\/$/, '')
  const request = options.fetch ?? globalThis.fetch.bind(globalThis)
  let queryVersion = 0

  const post = async (
    path: 'pull' | 'push',
    body: object,
    signal: AbortSignal
  ): Promise<unknown> => {
    const url = new URL(`${server}/${path}`)
    if (path === 'push') {
      url.searchParams.set('appID', options.appID)
      url.searchParams.set('schema', `${options.appID}_${options.shardNum ?? 0}`)
    }
    const response = await request(url.toString(), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(await options.headers?.()) },
      body: JSON.stringify(body),
      signal,
    })
    if (!response.ok) throw new Error(`Orez ${path} failed: ${response.status}`)
    const result: unknown = await response.json()
    if (result && typeof result === 'object' && 'error' in result) {
      throw new Error(`Orez ${path} failed: ${JSON.stringify(result)}`)
    }
    return result
  }

  return {
    async pull(
      state: ClientState,
      queries: readonly DesiredQuery[],
      signal: AbortSignal
    ) {
      const response = await post(
        'pull',
        {
          clientID: state.clientID,
          clientGroupID: state.clientGroupID,
          cookie: state.cookie,
          queries: {
            version: ++queryVersion,
            patch: [
              { op: 'clear' },
              ...queries.map((query) => ({ op: 'put', ...query })),
            ],
          },
        },
        signal
      )
      if (!response || typeof response !== 'object' || !('cookie' in response)) {
        throw new Error('Orez pull returned an invalid response')
      }
      return response as PullResponse
    },
    async push(state: ClientState, mutations: readonly Mutation[], signal: AbortSignal) {
      const response = (await post(
        'push',
        {
          clientGroupID: state.clientGroupID,
          pushVersion: 1,
          schemaVersion: options.schemaVersion,
          timestamp: Date.now(),
          mutations: mutations.map((mutation) => ({
            ...mutation,
            type: 'custom',
            args: [mutation.args],
          })),
        },
        signal
      )) as { mutations?: { id: { clientID: string; id: number }; result: JSONValue }[] }
      for (const mutation of response.mutations ?? []) {
        if (
          mutation.result &&
          typeof mutation.result === 'object' &&
          'error' in mutation.result &&
          mutation.result.error !== 'alreadyProcessed'
        ) {
          throw new Error(`Orez mutation failed: ${JSON.stringify(mutation)}`)
        }
      }
    },
  }
}
