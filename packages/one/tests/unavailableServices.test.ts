import { expect, test } from 'vitest'
import { One } from '../src/one'
import { proveUnavailableServices } from '../../../tests/native-features/fixtures/one-unavailable-services'

test('uniform services keep their no-native contract during SSR', async () => {
  expect(One.FileSystem.getDirectories()).toEqual({
    documents: '',
    cache: '',
    applicationSupport: '',
    temporary: '',
  })
  expect(await One.FileSystem.getInfo('file:///one-proof')).toEqual({
    uri: 'file:///one-proof',
    exists: false,
    isDirectory: false,
  })
  expect(await One.FileSystem.readDirectory('file:///one-proof')).toEqual([])
  await One.FileSystem.makeDirectory('file:///one-proof')
  expect(One.Motion.getAvailability()).toEqual({
    accelerometer: false,
    gyroscope: false,
    magnetometer: false,
    deviceMotion: false,
  })
  const remove = One.Motion.addListener(
    'accelerometer',
    0,
    () => {},
    () => {}
  )
  remove()
  remove()
  expect(() =>
    One.Motion.addListener(
      'accelerometer',
      -1,
      () => {},
      () => {}
    )
  ).toThrow('Motion.addListener intervalMs must be between 0 and 1000')
  await expect(One.ImageManipulator.transform('file:///one-proof.png')).rejects.toThrow(
    'ImageManipulator.transform needs an iOS or Android build'
  )
  const result = await proveUnavailableServices(One)
  expect(result.passed).toBe(true)
  expect(result.checks.length).toBeGreaterThan(60)
})
