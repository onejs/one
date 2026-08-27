import { describe, expect, test } from 'vitest'
import type { VXRNOptionsFilled } from './getOptionsFilled'
import { getViteServerConfig } from './getViteServerConfig'

describe('getViteServerConfig', () => {
  test('preserves the resolved CLI address over a static Vite server block', async () => {
    const config = {
      root: process.cwd(),
      mode: 'development',
      server: {
        host: '127.0.0.1',
        https: undefined,
        port: 4301,
      },
    } as VXRNOptionsFilled

    const result = await getViteServerConfig(config, {
      server: {
        host: '0.0.0.0',
        port: 4280,
      },
    })

    expect(result.server).toMatchObject({
      host: '127.0.0.1',
      port: 4301,
    })
  })
})
