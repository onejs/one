import { describe, expect, test } from 'vitest'
import { getServerOptionsFilled } from './getServerOptionsFilled'

describe('getServerOptionsFilled', () => {
  test('uses the configured TLS protocol in the public server URL', async () => {
    const server = await getServerOptionsFilled(
      {
        host: '127.0.0.1',
        https: {
          cert: 'certificate',
          key: 'private-key',
        },
      },
      'dev'
    )

    expect(server.protocol).toBe('https:')
    expect(server.url).toBe(`https://127.0.0.1:${server.port}`)
    expect(server.https).toEqual({
      cert: 'certificate',
      key: 'private-key',
    })
  })
})
