import { describe, expect, it } from 'vitest'
import { transformTreeShakeClient } from './clientTreeShakePlugin'

describe('clientTreeShakePlugin', () => {
  describe('transformTreeShakeClient', () => {
    it('should remove loader export and its imports', async () => {
      const code = `
import { serverOnlyModule } from 'server-only-pkg'
import { Text } from 'react-native'
import { useLoader } from 'one'

export function loader() {
  return serverOnlyModule()
}

export default function Page() {
  const data = useLoader(loader)
  return <Text>{data}</Text>
}
`
      const result = await transformTreeShakeClient(code, '/app/index.tsx')
      expect(result).toBeDefined()
      // The server-only import should be removed
      expect(result!.code).not.toContain('server-only-pkg')
      // But react-native and one should remain
      expect(result!.code).toContain('react-native')
      expect(result!.code).toContain('one')
    })

    it('should remove loader export with dynamic import', async () => {
      const code = `
import { Text } from 'react-native'
import { useLoader } from 'one'

export async function loader() {
  const { serverFn } = await import('server-only-pkg')
  return serverFn()
}

export default function Page() {
  const data = useLoader(loader)
  return <Text>{data}</Text>
}
`
      const result = await transformTreeShakeClient(code, '/app/index.tsx')
      expect(result).toBeDefined()
      // Dynamic import should also be removed along with the loader
      expect(result!.code).not.toContain('server-only-pkg')
    })

    it('should remove loader with const arrow function export', async () => {
      const code = `
import { serverOnlyModule } from 'server-only-pkg'
import { Text } from 'react-native'
import { useLoader } from 'one'

export const loader = async () => {
  return serverOnlyModule()
}

export default function Page() {
  const data = useLoader(loader)
  return <Text>{data}</Text>
}
`
      const result = await transformTreeShakeClient(code, '/app/index.tsx')
      expect(result).toBeDefined()
      // The server-only import should be removed
      expect(result!.code).not.toContain('server-only-pkg')
    })

    it('should handle multiple imports where only some are used in loader', async () => {
      const code = `
import { serverFn } from 'server-only-pkg'
import { sharedUtil } from 'shared-pkg'
import { Text } from 'react-native'
import { useLoader } from 'one'

export function loader() {
  return serverFn()
}

export default function Page() {
  const data = useLoader(loader)
  return <Text>{sharedUtil(data)}</Text>
}
`
      const result = await transformTreeShakeClient(code, '/app/index.tsx')
      expect(result).toBeDefined()
      // server-only-pkg should be removed (only used in loader)
      expect(result!.code).not.toContain('server-only-pkg')
      // shared-pkg should remain (used in component)
      expect(result!.code).toContain('shared-pkg')
    })

    it('should remove generateStaticParams and its imports', async () => {
      const code = `
import { getRoutes } from 'server-only-pkg'
import { Text } from 'react-native'

export function generateStaticParams() {
  return getRoutes()
}

export default function Page() {
  return <Text>Hello</Text>
}
`
      const result = await transformTreeShakeClient(code, '/app/[slug].tsx')
      expect(result).toBeDefined()
      expect(result!.code).not.toContain('server-only-pkg')
    })

    it('should not transform files without loader or generateStaticParams', async () => {
      const code = `
import { Text } from 'react-native'

export default function Page() {
  return <Text>Hello</Text>
}
`
      const result = await transformTreeShakeClient(code, '/app/index.tsx')
      expect(result).toBeUndefined()
    })

    it('should preserve type-only imports during tree shaking', async () => {
      const code = `
import type { SomeType } from 'types-pkg'
import { serverFn } from 'server-only-pkg'
import { Text } from 'react-native'
import { useLoader } from 'one'

export function loader(): SomeType {
  return serverFn()
}

export default function Page() {
  const data = useLoader(loader)
  return <Text>{data}</Text>
}
`
      const result = await transformTreeShakeClient(code, '/app/index.tsx')
      expect(result).toBeDefined()
      // Type import should be preserved
      expect(result!.code).toContain('types-pkg')
      // Server-only import should be removed
      expect(result!.code).not.toContain('server-only-pkg')
    })

    it('should preserve type imports even when used only in loader', async () => {
      const code = `
import type { APIGuildMember } from '@discordjs/core'
import { getClient } from 'discord-client'
import { Text } from 'react-native'
import { useLoader } from 'one'

export function loader(): APIGuildMember {
  return getClient()
}

export default function Page() {
  const data = useLoader(loader)
  return <Text>{JSON.stringify(data)}</Text>
}
`
      const result = await transformTreeShakeClient(code, '/app/index.tsx')
      expect(result).toBeDefined()
      // Type import should be preserved (TypeScript erases these at compile time)
      expect(result!.code).toContain('@discordjs/core')
      // Runtime import should be removed
      expect(result!.code).not.toContain('discord-client')
    })
  })
})
