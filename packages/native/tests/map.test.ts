import { beforeAll, describe, expect, it, vi } from 'vitest'

// same seam as blur.test.ts: plain functions over the spec modules, react
// never mounted, only the touched react-native surface mocked.
vi.mock('react-native', () => ({
  Platform: { OS: 'ios', Version: '26.4' },
  View: () => null,
  StyleSheet: {
    absoluteFill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
    flatten: (style: unknown) => style,
  },
}))
vi.mock('react-native/Libraries/Utilities/codegenNativeComponent', () => ({
  default: (name: string) => ({ __component: name }),
}))

let Map: typeof import('../src/ui/Map.ios').Map
let resolveNativeMapModel: typeof import('../src/ui/mapValidation').resolveNativeMapModel

beforeAll(async () => {
  Map = (await import('../src/ui/Map.ios')).Map
  resolveNativeMapModel = (await import('../src/ui/mapValidation')).resolveNativeMapModel
})

const camera = { coordinates: { latitude: 37.7955, longitude: -122.3937 }, zoom: 12 }

describe('resolveNativeMapModel', () => {
  it('seeds the default camera and empty layers', () => {
    expect(resolveNativeMapModel({})).toMatchObject({
      latitude: 37.7749,
      longitude: -122.4194,
      zoom: 12,
      markers: [],
    })
    expect(JSON.parse(resolveNativeMapModel({}).overlays)).toEqual({
      polylines: [],
      polygons: [],
      circles: [],
    })
  })

  it('normalizes unset strings to empty and unset widths to 0', () => {
    const model = resolveNativeMapModel({
      cameraPosition: camera,
      markers: [{ id: 'a', coordinates: camera.coordinates }],
      polylines: [{ id: 'l', coordinates: [camera.coordinates, camera.coordinates] }],
      polygons: [
        {
          id: 'g',
          coordinates: [camera.coordinates, camera.coordinates, camera.coordinates],
        },
      ],
      circles: [{ id: 'c', center: camera.coordinates, radius: 500 }],
    })
    expect(model.markers).toEqual([
      {
        id: 'a',
        title: '',
        latitude: 37.7955,
        longitude: -122.3937,
        tint: '',
      },
    ])
    expect(JSON.parse(model.overlays)).toEqual({
      polylines: [
        {
          id: 'l',
          coordinates: [camera.coordinates, camera.coordinates],
          color: '',
          width: 0,
        },
      ],
      polygons: [
        {
          id: 'g',
          coordinates: [camera.coordinates, camera.coordinates, camera.coordinates],
          color: '',
          lineColor: '',
          lineWidth: 0,
        },
      ],
      circles: [
        {
          id: 'c',
          center: camera.coordinates,
          radius: 500,
          color: '',
          lineColor: '',
          lineWidth: 0,
        },
      ],
    })
  })

  it('throws on bad cameras, coordinates, ids, colours, and sizes', () => {
    expect(() =>
      resolveNativeMapModel({
        cameraPosition: { coordinates: { latitude: 91, longitude: 0 }, zoom: 12 },
      })
    ).toThrow()
    expect(() =>
      resolveNativeMapModel({
        cameraPosition: { coordinates: { latitude: 0, longitude: -181 }, zoom: 12 },
      })
    ).toThrow()
    expect(() =>
      resolveNativeMapModel({
        cameraPosition: { coordinates: { latitude: 0, longitude: 0 }, zoom: NaN },
      })
    ).toThrow()
    expect(() =>
      resolveNativeMapModel({
        markers: [
          { id: 'a', coordinates: camera.coordinates },
          { id: 'a', coordinates: camera.coordinates },
        ],
      })
    ).toThrow('marker ids must be unique')
    expect(() =>
      resolveNativeMapModel({
        markers: [{ id: 'a', coordinates: camera.coordinates, tintColor: 'red' }],
      })
    ).toThrow('tintColor must be a #rrggbb or #rrggbbaa string')
    expect(() =>
      resolveNativeMapModel({ polylines: [{ id: 'l', coordinates: [] }] })
    ).toThrow('coordinates must be a non-empty array')
    expect(() =>
      resolveNativeMapModel({
        polygons: [
          {
            id: 'g',
            coordinates: [camera.coordinates],
            lineWidth: -1,
          },
        ],
      })
    ).toThrow('lineWidth must be a finite number at or above 0')
    expect(() =>
      resolveNativeMapModel({
        circles: [{ id: 'c', center: camera.coordinates, radius: 0 }],
      })
    ).toThrow('radius must be a positive number of metres')
  })
})

describe('Map', () => {
  it('sends the resolved model to the native view', () => {
    const marker = { id: 'coit', coordinates: camera.coordinates, title: 'Coit Tower' }
    const element = Map({ cameraPosition: camera, markers: [marker] })
    expect(element.type).toEqual({ __component: 'OneNativeUiMap' })
    expect(element.props).toMatchObject({
      latitude: 37.7955,
      longitude: -122.3937,
      zoom: 12,
      markers: [
        {
          id: 'coit',
          title: 'Coit Tower',
          latitude: 37.7955,
          longitude: -122.3937,
          tint: '',
        },
      ],
    })
  })

  it('passes the marker object from props for a native marker tap', () => {
    const marker = { id: 'coit', coordinates: camera.coordinates, title: 'Coit Tower' }
    const onMarkerClick = vi.fn()
    const element = Map({ markers: [marker], onMarkerClick })
    element.props.onNativeUiMapMarkerClick({ nativeEvent: { id: 'coit' } })
    expect(onMarkerClick).toHaveBeenCalledWith(marker)
  })

  it('drops a marker tap whose id left the props', () => {
    const onMarkerClick = vi.fn()
    const element = Map({ markers: [], onMarkerClick })
    element.props.onNativeUiMapMarkerClick({ nativeEvent: { id: 'gone' } })
    expect(onMarkerClick).not.toHaveBeenCalled()
  })

  it('reshapes native camera and tap events into coordinates', () => {
    const onCameraMove = vi.fn()
    const onMapClick = vi.fn()
    const element = Map({ cameraPosition: camera, onCameraMove, onMapClick })
    element.props.onNativeUiMapCameraMove({
      nativeEvent: { latitude: 1, longitude: 2, zoom: 10 },
    })
    element.props.onNativeUiMapClick({ nativeEvent: { latitude: 3, longitude: 4 } })
    expect(onCameraMove).toHaveBeenCalledWith({
      coordinates: { latitude: 1, longitude: 2 },
      zoom: 10,
    })
    expect(onMapClick).toHaveBeenCalledWith({
      coordinates: { latitude: 3, longitude: 4 },
    })
  })
})
