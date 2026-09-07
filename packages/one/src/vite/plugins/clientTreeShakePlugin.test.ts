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

    it('should embed routeId in loader stub when root is provided', async () => {
      const code = `
import { serverOnlyModule } from 'server-only-pkg'
import { useLoader } from 'one'

export async function loader() {
  return serverOnlyModule()
}

export default function Layout() {
  const data = useLoader(loader)
  return data
}
`
      const result = await transformTreeShakeClient(
        code,
        '/project/app/_layout.tsx',
        '/project'
      )
      expect(result).toBeDefined()
      // routeId should be relative to app/ directory to match route contextKey format
      expect(result!.code).toContain('export function loader() {return "./_layout.tsx"}')
      expect(result!.code).not.toContain('__vxrn__loader__')
    })

    it('should strip a custom router root from the loader stub routeId', async () => {
      const code = `
import { serverOnlyModule } from 'server-only-pkg'
import { useLoader } from 'one'

export const loader = async () => {
  return serverOnlyModule()
}

export default function Page() {
  const data = useLoader(loader)
  return data
}
`
      const result = await transformTreeShakeClient(
        code,
        '/project/app-sootsim/(marketing)/changelog/index+ssg.tsx',
        '/project',
        'app-sootsim'
      )
      expect(result).toBeDefined()
      // buildPage looks the stub up by the route contextKey, which is relative
      // to the configured router root rather than to a hardcoded app/
      expect(result!.code).toContain(
        'export function loader() {return "./(marketing)/changelog/index+ssg.tsx"}'
      )
    })

    it('should embed routeId with render mode suffix in loader stub', async () => {
      const code = `
import { serverOnlyModule } from 'server-only-pkg'
import { useLoader } from 'one'

export async function loader() {
  return serverOnlyModule()
}

export default function Layout() {
  const data = useLoader(loader)
  return data
}
`
      const result = await transformTreeShakeClient(
        code,
        '/project/app/user+ssr.tsx',
        '/project'
      )
      expect(result).toBeDefined()
      expect(result!.code).toContain('export function loader() {return "./user+ssr.tsx"}')
    })

    it('should fall back to __vxrn__loader__ stub when no root provided', async () => {
      const code = `
import { serverOnlyModule } from 'server-only-pkg'
import { useLoader } from 'one'

export async function loader() {
  return serverOnlyModule()
}

export default function Page() {
  const data = useLoader(loader)
  return data
}
`
      const result = await transformTreeShakeClient(code, '/app/index.tsx')
      expect(result).toBeDefined()
      expect(result!.code).toContain('__vxrn__loader__')
    })

    it('should not transform route file when loader is imported (no inline declaration)', async () => {
      // importing a loader from another file is not a supported pattern
      // the plugin only handles inline loader declarations
      const code = `
import { loader } from './loaders/my-loader'
import { useLoader } from 'one'

export { loader }

export default function Layout() {
  const data = useLoader(loader)
  return data
}
`
      const result = await transformTreeShakeClient(
        code,
        '/project/app/_layout.tsx',
        '/project'
      )
      expect(result).toBeUndefined()
    })

    it('should tree-shake server imports from source file where loader is defined', async () => {
      // when loader is defined in a separate file, that file gets its own transform pass
      // server-only imports should be removed, loader replaced with routeId stub
      const sourceCode = `
import { db } from 'server-only-db'

export async function loader() {
  return db.query('SELECT * FROM users')
}

export function helperUsedByClient() {
  return 'hello'
}
`
      const result = await transformTreeShakeClient(
        sourceCode,
        '/project/app/loaders/my-loader.ts',
        '/project'
      )
      expect(result).toBeDefined()
      // server-only import removed
      expect(result!.code).not.toContain('server-only-db')
      // client-safe export preserved
      expect(result!.code).toContain('helperUsedByClient')
      // loader replaced with stub (routeId relative to app/ dir)
      expect(result!.code).toContain(
        'export function loader() {return "./loaders/my-loader.ts"}'
      )
    })

    it('should not transform re-export from source syntax', async () => {
      // importing/re-exporting a loader from another file is not a supported pattern
      const code = `
export { loader } from './loaders/shared-loader'
import { useLoader } from 'one'

export default function Page() {
  return 'hello'
}
`
      const result = await transformTreeShakeClient(
        code,
        '/project/app/page.tsx',
        '/project'
      )
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

    it('should preserve side-effect imports during tree shaking', async () => {
      const code = `
import './style.css'
import { serverOnlyModule } from 'server-only-pkg'
import { Text } from 'react-native'

export function loader() {
  return serverOnlyModule()
}

export default function Page() {
  return <Text>Hello</Text>
}
`
      const result = await transformTreeShakeClient(code, '/app/index.tsx')
      expect(result).toBeDefined()
      expect(result!.code).toContain("import './style.css'")
      expect(result!.code).not.toContain('server-only-pkg')
    })

    it('should remove transitive local bindings exclusively used by loader', async () => {
      const code = `
import { db } from 'server-only-db'
import { Text } from 'react-native'

const secretKey = 'my-secret'

function querySecret() {
  return db.query(secretKey)
}

export async function loader() {
  return querySecret()
}

export default function Page() {
  return <Text>Hello</Text>
}
`
      const result = await transformTreeShakeClient(code, '/app/index.tsx')
      expect(result).toBeDefined()
      expect(result!.code).not.toContain('server-only-db')
      expect(result!.code).not.toContain('secretKey')
      expect(result!.code).not.toContain('querySecret')
      expect(result!.code).toContain('export default function Page')
    })

    it('should preserve shared local bindings used by both loader and client', async () => {
      const code = `
import { serverOnlyModule } from 'server-only-pkg'
import { Text } from 'react-native'

const sharedConfig = { siteName: 'One' }

function getTitle() {
  return sharedConfig.siteName
}

export function loader() {
  serverOnlyModule()
  return getTitle()
}

export default function Page() {
  return <Text>{getTitle()}</Text>
}
`
      const result = await transformTreeShakeClient(code, '/app/index.tsx')
      expect(result).toBeDefined()
      expect(result!.code).not.toContain('server-only-pkg')
      expect(result!.code).toContain('sharedConfig')
      expect(result!.code).toContain('getTitle')
    })

    it('should throw build error on syntax error in production', async () => {
      const origEnv = process.env.NODE_ENV
      try {
        process.env.NODE_ENV = 'production'
        const code = `
import { serverOnly } from 'server-only-pkg'
export function loader() {
  bad syntax {
}
`
        await expect(transformTreeShakeClient(code, '/app/index.tsx')).rejects.toThrow(
          /Failed to parse/
        )
      } finally {
        process.env.NODE_ENV = origEnv
      }
    })

    it('should log warning and return undefined on syntax error in development', async () => {
      const origEnv = process.env.NODE_ENV
      try {
        process.env.NODE_ENV = 'development'
        const code = `
import { serverOnly } from 'server-only-pkg'
export function loader() {
  bad syntax {
}
`
        const result = await transformTreeShakeClient(code, '/app/index.tsx')
        expect(result).toBeUndefined()
      } finally {
        process.env.NODE_ENV = origEnv
      }
    })

    it('should generate a valid sourcemap', async () => {
      const code = `
import { serverOnlyModule } from 'server-only-pkg'
import { Text } from 'react-native'

export function loader() {
  return serverOnlyModule()
}

export default function Page() {
  return <Text>Hello</Text>
}
`
      const result = await transformTreeShakeClient(code, '/app/index.tsx')
      expect(result).toBeDefined()
      expect(result!.map).toBeDefined()
      expect(result!.map.mappings).toBeDefined()
    })

    it('preserves shared import referenced in destructuring default parameter', async () => {
      const code = `import {shared} from "./shared"; export function loader(){return shared}; export default function Page({x = shared}) {return x}`
      const result = await transformTreeShakeClient(code, '/app/index.tsx')
      expect(result).toBeDefined()
      expect(result!.code).toContain('import {shared} from "./shared"')
      expect(result!.code).toContain('Page({x = shared})')
      expect(result!.code).toContain('export function loader()')
    })

    it('preserves shared import referenced in top-level executable statement', async () => {
      const code = `import {shared} from "./shared"; export function loader(){return shared}; if (globalThis.ready) shared();`
      const result = await transformTreeShakeClient(code, '/app/index.tsx')
      expect(result).toBeDefined()
      expect(result!.code).toContain('import {shared} from "./shared"')
      expect(result!.code).toContain('if (globalThis.ready) shared();')
      expect(result!.code).toContain('export function loader()')
    })

    it('preserves shared import referenced in top-level retained initializer', async () => {
      const code = `import {shared} from "./shared"; const retained = shared(); export function loader(){return shared}; export default function Page(){return null}`
      const result = await transformTreeShakeClient(code, '/app/index.tsx')
      expect(result).toBeDefined()
      expect(result!.code).toContain('import {shared} from "./shared"')
      expect(result!.code).toContain('const retained = shared();')
      expect(result!.code).toContain('export function loader()')
    })

    it('removes top-level declaration and import used exclusively by loader', async () => {
      const code = `import {secret} from "./secret"; const localSecret = secret(); export function loader(){return localSecret}; export default function Page(){return null}`
      const result = await transformTreeShakeClient(code, '/app/index.tsx')
      expect(result).toBeDefined()
      expect(result!.code).not.toContain('./secret')
      expect(result!.code).not.toContain('localSecret')
      expect(result!.code).toContain('export function loader()')
    })

    it('preserves shared import referenced in top-level destructuring default binding', async () => {
      const code = `import {shared} from "./shared"; const {x = shared} = {}; export function loader(){return [x,shared]}; export default function Page(){return x}`
      const result = await transformTreeShakeClient(code, '/app/index.tsx')
      expect(result).toBeDefined()
      expect(result!.code).toContain('import {shared} from "./shared"')
      expect(result!.code).toContain('const {x = shared} = {}')
      expect(result!.code).toContain('return x')
    })

    it('removes server-only import referenced in top-level destructuring default binding when used only by loader', async () => {
      const code = `import {secret} from "./server"; const {x = secret} = {}; export function loader(){return x}; export default function Page(){return null}`
      const result = await transformTreeShakeClient(code, '/app/index.tsx')
      expect(result).toBeDefined()
      expect(result!.code).not.toContain('./server')
      expect(result!.code).not.toContain('secret')
      expect(result!.code).not.toContain('{x = secret}')
      expect(result!.code).toContain('Page(){return null}')
    })

    it('removes server-only enum and class declarations used only by loader', async () => {
      const code = `import {server} from "./server"; enum E { X = server() }; export function loader() {return E.X}; export default function Page(){return null}`
      const result = await transformTreeShakeClient(code, '/app/index.tsx')
      expect(result).toBeDefined()
      expect(result!.code).not.toContain('./server')
      expect(result!.code).not.toContain('enum E')
      expect(result!.code).toContain('Page(){return null}')
    })

    it('preserves shared enum used by both loader and client Page', async () => {
      const code = `import {shared} from "./shared"; enum E { X = shared() }; export function loader() {return E.X}; export default function Page(){return E.X}`
      const result = await transformTreeShakeClient(code, '/app/index.tsx')
      expect(result).toBeDefined()
      expect(result!.code).toContain('import {shared} from "./shared"')
      expect(result!.code).toContain('enum E')
      expect(result!.code).toContain('Page(){return E.X}')
    })
  })
})
