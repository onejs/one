import path from 'node:path'
import { getReactNavigationConfig } from './getReactNavigationConfig'
import { getRoutes } from './router/getRoutes'

export type ReactComponent = () => React.ReactElement<any, any> | null
export type FileStub =
  | (Record<string, unknown> & {
      default: ReactComponent
      unstable_settings?: Record<string, any>
    })
  | ReactComponent
export type NativeIntentStub = any
export type MemoryContext = Record<string, FileStub | NativeIntentStub> & {
  '+native-intent'?: NativeIntentStub
}

const validExtensions = ['.js', '.jsx', '.ts', '.tsx']

export function inMemoryContext(context: MemoryContext) {
  return Object.assign(
    (id: string) => {
      id = id.replace(/^\.\//, '').replace(/\.\w*$/, '')
      return typeof context[id] === 'function' ? { default: context[id] } : context[id]
    },
    {
      resolve: (key: string) => key,
      id: '0',
      keys: () =>
        Object.keys(context).map((key) => {
          const ext = path.extname(key)
          key = key.replace(/^\.\//, '')
          key = key.startsWith('/') ? key : `./${key}`
          key = validExtensions.includes(ext) ? key : `${key}.js`

          return key
        }),
    }
  )
}

type MockContextConfig = string[] // Array of filenames to mock as empty components, e.g () => null

export function getMockContext(context: MockContextConfig) {
  if (Array.isArray(context)) {
    return inMemoryContext(
      Object.fromEntries(context.map((filename) => [filename, { default: () => null }]))
    )
  }

  throw new Error('Invalid context')
}

export function getMockConfig(context: MockContextConfig, metaOnly = true) {
  return getReactNavigationConfig(getRoutes(getMockContext(context))!, metaOnly)
}
