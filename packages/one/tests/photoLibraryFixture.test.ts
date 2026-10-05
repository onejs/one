import { readFileSync } from 'node:fs'
import { parse } from '@babel/parser'
import { transformSync } from 'esbuild'
import { describe, expect, it } from 'vitest'

// exercise the fixture's actual request handler without mounting a native app.
const source = readFileSync(
  new URL(
    '../../../tests/native-features/fixtures/one-native-photo-library.tsx',
    import.meta.url
  ),
  'utf8'
)
const ast = parse(source, { sourceType: 'module', plugins: ['typescript', 'jsx'] })
const component = ast.program.body.find(
  (node) => node.type === 'ExportDefaultDeclaration'
)
if (
  component?.type !== 'ExportDefaultDeclaration' ||
  component.declaration.type !== 'FunctionDeclaration'
)
  throw new Error('photo fixture component not found')
const handler = component.declaration.body.body.find(
  (node) => node.type === 'FunctionDeclaration' && node.id?.name === 'requestLimited'
)
if (!handler) throw new Error('photo fixture request handler not found')
const handlerCode = transformSync(source.slice(handler.start!, handler.end!), {
  loader: 'ts',
}).code

describe('photo library limited permission fixture', () => {
  it.each([
    ['ios', 'limited', true],
    ['ios', 'authorized', false],
    ['android', 'limited', true],
    ['android', 'authorized', true],
    ['ios', 'denied', false],
    ['android', 'denied', false],
  ] as const)('%s with %s accepts=%s', async (platform, permission, accepted) => {
    let status = ''
    let result = ''
    let reads = 0
    const request = new Function(
      'One',
      'Platform',
      'setStatus',
      'setReadPermission',
      'setLimitedResult',
      'errorCode',
      `${handlerCode}; return requestLimited`
    )(
      {
        PhotoLibrary: {
          presentLimitedLibraryPicker: async () => {
            throw Object.assign(new Error('before'), {
              code: 'E_PHOTO_LIBRARY_PERMISSION',
            })
          },
          requestReadPermission: async () => permission,
          getReadPermissionStatus: () => permission,
          listAssets: async () => {
            reads++
            return { totalCount: 2 }
          },
        },
      },
      { OS: platform },
      (value: string) => {
        status = value
      },
      () => {},
      (value: string) => {
        result = value
      },
      (error: { code?: string }) => error.code ?? 'unknown'
    )
    await request()
    expect(status).toBe(
      accepted
        ? 'limited-ready'
        : `limited-error: unknown limited permission: ${permission}`
    )
    expect(reads).toBe(accepted ? 1 : 0)
    expect(result).toBe(
      accepted
        ? `before=E_PHOTO_LIBRARY_PERMISSION; permission=${permission}; visible=2`
        : ''
    )
  })
})
