import { describe, expect, it } from 'vitest'
import { transformTreeShakeClient } from './clientTreeShakePlugin'

describe('transformTreeShakeClient', () => {
  it('should remove loader function and unused imports', async () => {
    const code = `
import { db } from 'server-only-db'

export function loader() {
  return db.query()
}

export default function Page() {
  return <div>Hello</div>
}
`
    const result = await transformTreeShakeClient(code, 'test.tsx')
    expect(result).toBeDefined()
    expect(result?.code).not.toContain('server-only-db')
    expect(result?.code).toContain('export default function Page')
    expect(result?.code).toContain('export function loader()')
  })

  it('should preserve type-only imports after dead code elimination', async () => {
    const code = `
import type { LoaderProps } from 'one'
import { db } from 'server-only-db'

export function loader(props: LoaderProps) {
  return db.query()
}

export default function Page() {
  return <div>Hello</div>
}
`
    const result = await transformTreeShakeClient(code, 'test.tsx')
    expect(result).toBeDefined()
    // Type-only import should be preserved
    expect(result?.code).toContain("import type { LoaderProps } from 'one'")
    // Server-only import should be removed
    expect(result?.code).not.toContain('server-only-db')
    // Component should be preserved
    expect(result?.code).toContain('export default function Page')
  })

  it('should preserve multiple type-only imports', async () => {
    const code = `
import type { LoaderProps, RouteInfo } from 'one'
import type { ServerType } from './server-types'
import { serverUtil } from './server-utils'

export function loader(props: LoaderProps): RouteInfo {
  return serverUtil()
}

export default function Page() {
  return <div>Hello</div>
}
`
    const result = await transformTreeShakeClient(code, 'test.tsx')
    expect(result).toBeDefined()
    // Both type-only imports should be preserved
    expect(result?.code).toContain("import type { LoaderProps, RouteInfo } from 'one'")
    expect(result?.code).toContain("import type { ServerType } from './server-types'")
    // Server utility import should be removed
    expect(result?.code).not.toContain('server-utils')
  })

  it('should not modify code without loader or generateStaticParams', async () => {
    const code = `
import type { SomeType } from 'some-module'

export default function Page() {
  return <div>Hello</div>
}
`
    const result = await transformTreeShakeClient(code, 'test.tsx')
    // Should return undefined since no transformation is needed
    expect(result).toBeUndefined()
  })

  it('should remove generateStaticParams and preserve type imports', async () => {
    const code = `
import type { Params } from 'one'
import { getItems } from './server-data'

export function generateStaticParams(): Params[] {
  return getItems().map(item => ({ id: item.id }))
}

export default function Page() {
  return <div>Hello</div>
}
`
    const result = await transformTreeShakeClient(code, 'test.tsx')
    expect(result).toBeDefined()
    // Type import should be preserved
    expect(result?.code).toContain("import type { Params } from 'one'")
    // Server data import should be removed
    expect(result?.code).not.toContain('server-data')
    // Empty generateStaticParams should be added back
    expect(result?.code).toContain('export function generateStaticParams() {}')
  })
})
