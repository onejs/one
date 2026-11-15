import { beforeAll, describe, expect, it, vi } from 'vitest'
import { act, create } from 'react-test-renderer'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

// same stub setup as mapControls.test.tsx: the Picker wrapper is a function
// over the spec modules, so a test drives the element it builds rather than
// mounting a native view. the spec modules collapse to named stubs.
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
let PickerWithChildren: typeof import('../src/platform/pickerChildren.native')

beforeAll(async () => {
  Controls = await import('../src/platform/generated/Controls.native')
  PickerWithChildren = await import('../src/platform/pickerChildren.native')
})

const option = (value: string, label: string) => (
  <Controls.Text key={value} text={label} swiftStyle={{ tag: value }} />
)

function stubOf(root: ReturnType<typeof create>, name: string) {
  return root.root.find((node) => (node.type as { displayName?: string })?.displayName === name)
}

describe('Picker children slot', () => {
  it('forwards tagged text options to the native picker view', () => {
    let root: ReturnType<typeof create> | undefined
    act(() => {
      root = create(
        (
          <PickerWithChildren.Picker label="Seat" selection="a" onSelectionChange={() => {}}>
            {option('a', 'A')}
            {option('b', 'B')}
          </PickerWithChildren.Picker>
        ) as never
      )
    })
    const native = stubOf(root!, 'OneNativePicker')
    expect(native.props.value).toBe('a')
    expect(native.props.label).toBe('Seat')
    expect('options' in native.props).toBe(false)
    const children = native.props.children as { props: { text: string; swiftStyle: { tag: string } } }[]
    expect(children).toHaveLength(2)
    expect(children.map((child) => [child.props.text, child.props.swiftStyle.tag])).toEqual([
      ['A', 'a'],
      ['B', 'b'],
    ])
  })

  it('rejects a child that is not text', () => {
    const Bogus = () => null
    expect(() =>
      act(() => {
        create(
          (
            <PickerWithChildren.Picker label="Seat" selection="a" onSelectionChange={() => {}}>
              <Bogus />
            </PickerWithChildren.Picker>
          ) as never
        )
      })
    ).toThrow('One.iOS.Picker accepts One.iOS.Text elements as direct children')
  })

  it('rejects an option without a string tag', () => {
    expect(() =>
      act(() => {
        create(
          (
            <PickerWithChildren.Picker label="Seat" selection="a" onSelectionChange={() => {}}>
              <Controls.Text text="A" />
            </PickerWithChildren.Picker>
          ) as never
        )
      })
    ).toThrow('One.iOS.Picker option text must set swiftStyle.tag to a string value')
  })

  it('rejects an empty picker', () => {
    expect(() =>
      act(() => {
        create(
          (
            <PickerWithChildren.Picker label="Seat" selection="a" onSelectionChange={() => {}} />
          ) as never
        )
      })
    ).toThrow('One.iOS.Picker requires at least one One.iOS.Text child')
  })

  it('rejects duplicate option tags', () => {
    expect(() =>
      act(() => {
        create(
          (
            <PickerWithChildren.Picker label="Seat" selection="a" onSelectionChange={() => {}}>
              {option('a', 'A')}
              {option('a', 'B')}
            </PickerWithChildren.Picker>
          ) as never
        )
      })
    ).toThrow('One.iOS.Picker option tags must be unique')
  })

  it('rejects a selection matching no option tag', () => {
    expect(() =>
      act(() => {
        create(
          (
            <PickerWithChildren.Picker label="Seat" selection="zzz" onSelectionChange={() => {}}>
              {option('a', 'A')}
            </PickerWithChildren.Picker>
          ) as never
        )
      })
    ).toThrow('One.iOS.Picker selection must match an option tag')
  })

  it('rejects raw text children', () => {
    expect(() =>
      act(() => {
        create(
          (
            <PickerWithChildren.Picker label="Seat" selection="a" onSelectionChange={() => {}}>
              nope
            </PickerWithChildren.Picker>
          ) as never
        )
      })
    ).toThrow('not raw text')
  })
})
