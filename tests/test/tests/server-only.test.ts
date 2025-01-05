import { describe, expect, test, it } from 'vitest'
import { fetchDevAndProd } from './utils/fetchDevAndProd'

describe('server-only', () => {
  it('should not break API routes', async () => {
    const [devRes, prodRes] = await fetchDevAndProd('/server-only/api', 'text')
    debugger
  })
  it('should break SPA routes', async () => {
    const [devRes, prodRes] = await fetchDevAndProd('/server-only/spa', 'text')
    debugger
  })
})
