// offline crop controls supplement the live picker and callback omission run.
import { expect, test } from 'bun:test'
import path from 'node:path'
import { PNG } from 'pngjs'
import { readPng } from './visual-pixel-gate'
import { VISUAL_CHECKS } from './visual-declarations'

const declaration = VISUAL_CHECKS.find((check) => check.name === 'date-graphical')!
const controls = path.join(import.meta.dir, '../fixtures/calendar-sdk27')
const one = () => {
  const original = readPng(path.join(controls, 'one.png'))
  const crop = new PNG({ width: original.width, height: original.height })
  original.data.copy(crop.data)
  return crop
}
const set = (crop: PNG, x: number, y: number, color: number[]) => {
  const offset = (y * crop.width + x) * 4
  crop.data.set([...color, 255], offset)
}
const rejects = (crop: PNG) =>
  expect(declaration.measureSubject(crop)).toBeLessThan(declaration.minSubjectFloor)

test('unchanged native Apple and One crops pass the same subject floor', () => {
  expect(declaration.measureSubject(one())).toBeGreaterThanOrEqual(
    declaration.minSubjectFloor
  )
  expect(
    declaration.measureSubject(readPng(path.join(controls, 'apple.png')))
  ).toBeGreaterThanOrEqual(declaration.minSubjectFloor)
})

test('offline omission of the selected badge rejects', () => {
  const crop = one()
  for (let y = 0; y < crop.height; y++)
    for (let x = 0; x < crop.width; x++) {
      const offset = (y * crop.width + x) * 4
      if (crop.data[offset] < 240) set(crop, x, y, [245, 245, 247])
    }
  rejects(crop)
})

test('offline omission of the contrasting numeral rejects a bare circle', () => {
  const crop = one()
  for (let y = 24; y <= 72; y++) for (let x = 36; x <= 88; x++) set(crop, x, y, [0, 0, 0])
  rejects(crop)
})

test('offline rectangular badge with the real numeral rejects', () => {
  const crop = one()
  for (let y = 0; y < 114; y++)
    for (let x = 0; x < 129; x++) {
      if (x < 36 || x > 88 || y < 24 || y > 72) set(crop, x, y, [0, 0, 0])
    }
  rejects(crop)
})

test('offline displaced badge and numeral reject the anchored placement', () => {
  const crop = one(),
    original = one()
  for (let y = 0; y < crop.height; y++)
    for (let x = 0; x < crop.width; x++) {
      if (x < 12) set(crop, x, y, [245, 245, 247])
      else {
        const source = (y * crop.width + x - 12) * 4
        crop.data.set(
          original.data.subarray(source, source + 4),
          (y * crop.width + x) * 4
        )
      }
    }
  rejects(crop)
})

test('offline opaque black fake rejects', () => {
  const crop = one()
  for (let y = 0; y < crop.height; y++)
    for (let x = 0; x < crop.width; x++) set(crop, x, y, [0, 0, 0])
  rejects(crop)
})
