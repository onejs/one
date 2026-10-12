import { beforeAll, describe, expect, it, vi } from 'vitest'
import { act, create } from 'react-test-renderer'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

// the Map wrapper is a function over the spec modules, so a test drives the
// element it builds rather than mounting a native view. the spec modules
// collapse to named stubs and Platform pins iOS.
vi.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '26.4' },
  View: () => null,
  Text: () => null,
  Image: () => null,
  ScrollView: () => null,
  TextInput: () => null,
}))
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', () => ({
  default: (name: string) => {
    const Stub = (_props: unknown) => null
    Stub.displayName = name
    return Stub
  },
}))

let Controls: typeof import('../src/platform/generated/Controls.native')
let MapWithControls: typeof import('../src/platform/mapControls.native')

beforeAll(async () => {
  Controls = await import('../src/platform/generated/Controls.native')
  MapWithControls = await import('../src/platform/mapControls.native')
})

const markers = [{ id: 'coit', label: 'Coit Tower', latitude: 37.8024, longitude: -122.4058 }]

function stubOf(root: ReturnType<typeof create>, name: string) {
  return root.root.find((node) => (node.type as { displayName?: string })?.displayName === name)
}

describe('Map controls slot', () => {
  it('forwards map controls to the native map view', () => {
    let root: ReturnType<typeof create> | undefined
    act(() => {
      root = create(
        (
          <MapWithControls.Map markers={markers}>
            <Controls.MapCompass />
            <Controls.MapPitchToggle />
            <Controls.MapUserLocationButton />
          </MapWithControls.Map>
        ) as never
      )
    })
    const native = stubOf(root!, 'OneNativeMap')
    expect(native.props).toMatchObject({ markers })
    const children = native.props.children as unknown[]
    expect(children).toHaveLength(3)
  })

  it('leaves a control-less map alone', () => {
    let root: ReturnType<typeof create> | undefined
    act(() => {
      root = create((<MapWithControls.Map markers={markers} />) as never)
    })
    expect(stubOf(root!, 'OneNativeMap').props).toMatchObject({ markers })
  })

  it('rejects a child that is not a map control', () => {
    const Bogus = () => null
    expect(() =>
      act(() => {
        create(
          (
            <MapWithControls.Map markers={markers}>
              <Bogus />
            </MapWithControls.Map>
          ) as never
        )
      })
    ).toThrow('One.iOS.Map accepts')
  })

  it('rejects raw text children', () => {
    expect(() =>
      act(() => {
        create((<MapWithControls.Map markers={markers}>nope</MapWithControls.Map>) as never)
      })
    ).toThrow('not raw text')
  })
})
