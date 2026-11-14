import type {
  ClientState,
  DesiredQuery,
  Mutation,
  MutationOutcome,
  JSONValue,
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
            version: state.queryVersion,
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
      if ('gotQueries' in response && response.gotQueries !== undefined) {
        const got = response.gotQueries
        if (
          !got ||
          typeof got !== 'object' ||
          !('version' in got) ||
          !Number.isSafeInteger(got.version) ||
          !('patch' in got) ||
          !Array.isArray(got.patch)
        )
          throw new Error('Orez pull returned invalid gotQueries')
        return { ...response, gotQueriesPatch: got.patch } as PullResponse
      }
      return response as PullResponse
    },
    async push(state: ClientState, mutations: readonly Mutation[], signal: AbortSignal) {
      const received = await post(
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
      )
      if (!received || typeof received !== 'object')
        throw new Error('Orez push returned an invalid response')
      const response = 'pushResponse' in received ? received.pushResponse : received
      if (
        !response ||
        typeof response !== 'object' ||
        !('mutations' in response) ||
        !Array.isArray(response.mutations)
      )
        throw new Error('Orez push returned an invalid mutation response')
      const expected = new Set(mutations.map((mutation) => mutation.id))
      const outcomes: MutationOutcome[] = []
      for (const mutation of response.mutations) {
        if (
          !mutation ||
          typeof mutation !== 'object' ||
          !('id' in mutation) ||
          !mutation.id ||
          typeof mutation.id !== 'object' ||
          !('clientID' in mutation.id) ||
          mutation.id.clientID !== state.clientID ||
          !('id' in mutation.id) ||
          typeof mutation.id.id !== 'number' ||
          !expected.delete(mutation.id.id)
        )
          throw new Error('Orez push returned an unexpected mutation identity')
        if (
          !mutation.result ||
          typeof mutation.result !== 'object' ||
          Array.isArray(mutation.result)
        )
          throw new Error('Orez push returned an invalid mutation result')
        const result = mutation.result as Record<string, JSONValue>
        if ('error' in result && typeof result.error !== 'string')
          throw new Error('Orez push returned an invalid mutation error')
        if (result.error === 'app' && typeof result.message !== 'string')
          throw new Error('Orez push returned an invalid application error')
        if (result.error === 'alreadyProcessed') continue
        outcomes.push({
          id: mutation.id.id,
          result: result.error
            ? {
                type: 'error',
                error: {
                  type: result.error === 'app' ? 'app' : 'zero',
                  message:
                    typeof result.message === 'string'
                      ? result.message
                      : JSON.stringify(result),
                  details: result.details,
                },
              }
            : { type: 'success' },
        })
      }
      if (expected.size) throw new Error('Orez push omitted mutation results')
      return outcomes
    },
  }
}
