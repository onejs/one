import { readFileSync } from 'node:fs'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { act, create } from 'react-test-renderer'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

// the Toggle adapter is a function over the spec modules, so a test drives the element
// it builds rather than mounting a native view. the spec modules collapse to named
// stubs and Platform pins iOS.
vi.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '26.4' },
}))
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', () => ({
  default: (name: string) => {
    const Stub = (_props: unknown) => null
    Stub.displayName = name
    return Stub
  },
}))

let Controls: typeof import('../src/platform/generated/Controls.native')

beforeAll(async () => {
  Controls = await import('../src/platform/generated/Controls.native')
})

const schema = JSON.parse(readFileSync(new URL('../schema.json', import.meta.url), 'utf8'))
const component = (publicName: string) =>
  schema.components.find((entry: { publicName: string }) => entry.publicName === publicName)

function stubOf(root: ReturnType<typeof create>, name: string) {
  return root.root.find((node) => (node.type as { displayName?: string })?.displayName === name)
}

describe('toggle system image', () => {
  it('carries systemImage as a string prop', () => {
    expect(component('Toggle').props).toMatchObject({
      systemImage: { type: 'string' },
    })
  })

  it('passes the image through to the native view', () => {
    let root: ReturnType<typeof create> | undefined
    act(() => {
      root = create(
        (
          <Controls.Toggle
            label="Wi-Fi"
            systemImage="wifi"
            isOn={true}
            onIsOnChange={() => {}}
          />
        ) as never
      )
    })
    expect(stubOf(root!, 'OneNativeToggle').props).toMatchObject({
      label: 'Wi-Fi',
      systemImage: 'wifi',
    })
  })

  it('leaves the text-only toggle alone', () => {
    let root: ReturnType<typeof create> | undefined
    act(() => {
      root = create(
        (<Controls.Toggle label="Wi-Fi" isOn={false} onIsOnChange={() => {}} />) as never
      )
    })
    expect(stubOf(root!, 'OneNativeToggle').props).toMatchObject({
      label: 'Wi-Fi',
      systemImage: '',
    })
  })

  it('rejects a systemImage that is not a string', () => {
    expect(() =>
      act(() => {
        create(
          (
            <Controls.Toggle
              label="Wi-Fi"
              systemImage={7 as never}
              isOn={true}
              onIsOnChange={() => {}}
            />
          ) as never
        )
      })
    ).toThrow('Toggle systemImage must be a string')
  })
})
