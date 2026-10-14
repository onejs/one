import { Component, createElement, createRef } from 'react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'
import { act, create, type ReactTestRenderer } from 'react-test-renderer'
import type { CameraViewProps, CameraViewRef } from '../src/platform/camera/types'

globalThis.IS_REACT_ACT_ENVIRONMENT = true

const commands = vi.hoisted(() => ({ takePicture: vi.fn() }))

vi.mock('react-native', () => ({ Platform: { OS: 'ios' } }))
// a class stub so the view's ref attaches to an instance, as it does to the host view.
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', () => ({
  default: (name: string) =>
    class extends Component<Record<string, unknown>> {
      static displayName = name
      render() {
        return null
      }
    },
}))
vi.mock('react-native/Libraries/Utilities/codegenNativeCommands', () => ({
  default: () => commands,
}))

let CameraView: typeof import('../src/platform/camera/index.native').CameraView

beforeAll(async () => {
  ;({ CameraView } = await import('../src/platform/camera/index.native'))
})

beforeEach(() => commands.takePicture.mockReset())

function mount(props: CameraViewProps = {}) {
  const ref = createRef<CameraViewRef>()
  let root: ReactTestRenderer | undefined
  act(() => {
    root = create(createElement(CameraView, { ...props, ref }))
  })
  const native = () => root!.root.find((node) => node.type.displayName === 'OneNativeCamera')
  const emit = (event: Record<string, unknown>) =>
    act(() => {
      native().props.onNativeCameraPicture({ nativeEvent: event })
    })
  return { ref, root: root!, native, emit }
}

const picture = { uri: 'file:///cache/Camera/a.jpg', width: 3024, height: 4032, base64: '', error: '' }

describe('CameraView capture', () => {
  it('passes flash, torch and zoom to the native view', () => {
    const { native } = mount({ flash: 'auto', enableTorch: true, zoom: 0.25 })
    expect(native().props).toMatchObject({ flash: 'auto', enableTorch: true, zoom: 0.25 })
  })

  it('resolves the matching request with the native picture', async () => {
    const { ref, emit } = mount()
    const taken = ref.current!.takePicture()
    expect(commands.takePicture).toHaveBeenCalledTimes(1)
    const [, requestId, quality, base64] = commands.takePicture.mock.calls[0]
    expect([quality, base64]).toEqual([1, false])
    emit({ ...picture, requestId: requestId + 1000 })
    emit({ ...picture, base64: 'ignored', requestId })
    await expect(taken).resolves.toEqual({
      uri: picture.uri,
      width: 3024,
      height: 4032,
      format: 'jpg',
    })
  })

  it('returns base64 only when asked', async () => {
    const { ref, emit } = mount()
    const taken = ref.current!.takePicture({ quality: 0.5, base64: true })
    const [, requestId, quality, base64] = commands.takePicture.mock.calls[0]
    expect([quality, base64]).toEqual([0.5, true])
    emit({ ...picture, base64: '/9j/', requestId })
    await expect(taken).resolves.toMatchObject({ base64: '/9j/' })
  })

  it('rejects with the native error code', async () => {
    const { ref, emit } = mount()
    const taken = ref.current!.takePicture()
    const [, requestId] = commands.takePicture.mock.calls[0]
    emit({ ...picture, requestId, error: 'E_CAMERA_NOT_READY: CameraView is not ready to take a picture (state: unavailable)' })
    await expect(taken).rejects.toMatchObject({
      code: 'E_CAMERA_NOT_READY',
      message: 'CameraView is not ready to take a picture (state: unavailable)',
    })
  })

  it('rejects pending pictures when the view unmounts', async () => {
    const { ref, root } = mount()
    const taken = ref.current!.takePicture()
    act(() => root.unmount())
    await expect(taken).rejects.toMatchObject({ code: 'E_CAMERA_UNMOUNTED' })
  })

  it('rejects invalid options without reaching native code', async () => {
    const { ref } = mount()
    await expect(ref.current!.takePicture({ quality: 2 })).rejects.toThrow(RangeError)
    await expect(ref.current!.takePicture({ quality: Number.NaN })).rejects.toThrow(RangeError)
    expect(commands.takePicture).not.toHaveBeenCalled()
  })

  it('throws on invalid capture props', () => {
    const quiet = vi.spyOn(console, 'error').mockImplementation(() => {})
    expect(() => mount({ zoom: 1.5 })).toThrow('CameraView.zoom must be a number from 0 to 1')
    expect(() => mount({ flash: 'torch' as 'on' })).toThrow('CameraView.flash must be off, on or auto')
    quiet.mockRestore()
  })
})
