import fs from 'node:fs'
import path from 'node:path'
import { extractCrop, readPng } from './visual-pixel-gate'

type Bounds = { x: number; y: number; width: number; height: number }
type Reading = {
  effect: string
  variant: string
  bounds: Bounds
  curves: {
    linear: number[]
    smooth: number[]
    custom: number[]
    bezier: number[]
    clamped: number[]
    presetSerialization: string
    customSerialization: string
    bezierSerialization: string
    wrongPresetSerialization: string
  }
}
type Capture = {
  file: string
  reading: Reading
  viewport: Bounds
  stage: Bounds
  root: Bounds
}
type Image = ReturnType<typeof extractCrop>

function channel(image: Image, x: number, y: number, c = 0) {
  return image.data[(Math.floor(y) * image.width + Math.floor(x)) * 4 + c]! / 255
}
function mean(image: Image, x: number, y: number, width = 8, height = 8, c = 0) {
  const scale = image.width / 300
  let sum = 0
  let n = 0
  for (let py = Math.ceil(y * scale); py < (y + height) * scale; py++) {
    for (let px = Math.ceil(x * scale); px < (x + width) * scale; px++) {
      sum += channel(image, px, py, c)
      n++
    }
  }
  return sum / n
}
function contrast(image: Image, x: number, y: number, height: number) {
  const scale = image.width / 300
  let sum = 0
  let n = 0
  for (let py = Math.ceil(y * scale) + 1; py < (y + height) * scale; py++) {
    sum += Math.abs(channel(image, x * scale, py) - channel(image, x * scale, py - 1))
    n++
  }
  return sum / n
}
function childDifference(a: Image, b: Image) {
  const scale = a.width / 300
  let sum = 0
  let n = 0
  for (let y = 82 * scale; y < 118 * scale; y++) {
    for (let x = 42 * scale; x < 78 * scale; x++) {
      sum += Math.abs(channel(a, x, y) - channel(b, x, y))
      n++
    }
  }
  return sum / n
}

// the old signature-based progressive oracle remains unchanged. this suite
// measures only the mounted bounded public effects and the current layered blur.
export async function runEffectsSuite(options: {
  artifactDir: string
  captureScale: number
  geometryTolerance?: number
  capture: (effect: string, variant: string) => Promise<Capture>
  pass: (name: string) => void
}) {
  const geometryTolerance = options.geometryTolerance ?? 0
  const measurements: unknown[] = []
  const ensure = (name: string, accepted: boolean) => {
    if (!accepted)
      throw new Error(`${name} failed; effects-pixels.json records measurements`)
    options.pass(name)
  }
  const capture = async (effect: string, variant: string) => {
    const result = await options.capture(effect, variant)
    const { bounds } = result.reading
    ensure(
      `${effect} ${variant} native stage is visible and measured`,
      Math.abs(bounds.width - 300) <= geometryTolerance &&
        Math.abs(bounds.height - 240) <= geometryTolerance &&
        result.stage.x >= 0 &&
        result.stage.y >= 0 &&
        result.stage.x + bounds.width <= result.viewport.width &&
        result.stage.y + bounds.height <= result.viewport.height &&
        Math.abs(bounds.x + result.root.x - result.stage.x) <= geometryTolerance &&
        Math.abs(bounds.y + result.root.y - result.stage.y) <= geometryTolerance &&
        Math.abs(result.stage.width - 300) <= geometryTolerance &&
        Math.abs(result.stage.height - 240) <= geometryTolerance
    )
    const png = readPng(result.file)
    ensure(
      `${effect} ${variant} capture is native ${options.captureScale}x`,
      png.width === Math.round(result.viewport.width * options.captureScale)
    )
    return {
      image: extractCrop(png, { ...result.stage, viewportWidth: result.viewport.width }),
      reading: result.reading,
    }
  }
  const record = (entry: unknown) => {
    measurements.push(entry)
    fs.writeFileSync(
      path.join(options.artifactDir, 'effects-pixels.json'),
      JSON.stringify(measurements, null, 2)
    )
  }
  for (const effect of ['blur', 'edge-blur', 'mask', 'edge-mask', 'overlay']) {
    const canonical = await capture(effect, 'canonical')
    const curves = canonical.reading.curves
    const linearSamples = (values: number[]) =>
      values.length === 32 && values[0] === 1 && values[31] === 0 && values[8] === 0.7419
    const smoothSerialization = (value: string) => value === 'smooth'
    ensure(
      `${effect} public curves have known endpoints and serialization`,
      linearSamples(curves.linear) &&
        curves.smooth[8] === 0.4084 &&
        JSON.stringify(curves.custom) === '[1,1,0,0]' &&
        JSON.stringify(curves.clamped) === '[1,0.5,0]' &&
        JSON.stringify(curves.bezier) === JSON.stringify(curves.linear) &&
        smoothSerialization(curves.presetSerialization) &&
        curves.customSerialization === '1,1,0,0' &&
        curves.bezierSerialization === curves.bezier.join(',')
    )
    ensure(
      `${effect} smooth control rejects linear samples`,
      !linearSamples(curves.smooth)
    )
    ensure(
      `${effect} linear control rejects smooth serialization`,
      !smoothSerialization(curves.wrongPresetSerialization)
    )
    const bypass = await capture(effect, 'bypass')
    const wrong = await capture(effect, 'wrong')
    const gate = (image: Image): Record<string, boolean> => {
      if (effect === 'mask')
        return {
          hidden: mean(image, 20, 80) < 0.01,
          visible:
            mean(image, 100, 160) > 0.99 &&
            mean(image, 100, 160, 8, 8, 2) > 0.99 &&
            mean(image, 100, 160, 8, 8, 1) < 0.01,
          alpha:
            Math.abs(mean(image, 100, 80) - 0.5) < 0.02 &&
            mean(image, 100, 80, 8, 8, 1) < 0.01,
        }
      if (effect === 'edge-mask' || effect === 'overlay')
        return {
          outer: mean(image, 200, 8) < 0.02,
          ramp: mean(image, 200, 54) > 0.35 && mean(image, 200, 54) < 0.6,
          curve: mean(image, 200, 26) < 0.02 && mean(image, 200, 86) > 0.98,
          inner: mean(image, 200, 150) > 0.99,
        }
      const y = effect === 'blur' ? 150 : 190
      const energy = contrast(image, 240, y, 32)
      const sharp = contrast(bypass.image, 240, y, 32)
      const left = mean(image, 100, y, 20, 32)
      const right = mean(image, 240, y, 20, 32)
      return {
        blurred: sharp > 0.03 && energy < sharp * 0.45,
        backdrop: right - left > 0.15 && left > 0.05 && right < 0.95,
        ...(effect === 'edge-blur'
          ? { inner: contrast(image, 240, 30, 40) > sharp * 0.9 }
          : { child: childDifference(image, bypass.image) < 0.01 }),
      }
    }
    const positive = gate(canonical.image)
    const negative = gate(bypass.image)
    const incorrect = gate(wrong.image)
    record({
      effect,
      variant: 'canonical',
      positive,
      bypass: negative,
      wrong: incorrect,
      mask: {
        hidden: mean(canonical.image, 20, 80),
        visible: mean(canonical.image, 100, 160),
        alpha: mean(canonical.image, 100, 80),
      },
      backdrop: {
        left: mean(canonical.image, 100, effect === 'blur' ? 150 : 190, 20, 32),
        right: mean(canonical.image, 240, effect === 'blur' ? 150 : 190, 20, 32),
      },
      childMAE: effect === 'blur' ? childDifference(canonical.image, bypass.image) : null,
      innerContrast: contrast(canonical.image, 240, 30, 40),
      samples: [8, 26, 54, 86, 150, 190].map((y) => mean(canonical.image, 200, y)),
      contrast: contrast(canonical.image, 240, 190, 32),
      sharpContrast: contrast(bypass.image, 240, 190, 32),
    })
    for (const [name, accepted] of Object.entries(positive))
      ensure(`${effect} ${name} pixels`, accepted)
    if (effect === 'mask') {
      ensure('mask bypass rejects hidden bounds', !negative.hidden)
      ensure('mask opaque alpha control rejects half alpha', !incorrect.alpha)
      const empty = await capture(effect, 'zero')
      const emptyGate = gate(empty.image)
      record({ effect, variant: 'empty-content', result: emptyGate })
      ensure('mask empty content rejects visible bounds', !emptyGate.visible)
    } else if (effect === 'edge-mask' || effect === 'overlay') {
      ensure(
        `${effect} no edge rejects outer and ramp`,
        !negative.outer && !negative.ramp
      )
      ensure(`${effect} wrong serialized curve rejects curve shape`, !incorrect.curve)
      const empty = await capture(effect, 'zero')
      const emptyGate = gate(empty.image)
      record({ effect, variant: 'empty-content', result: emptyGate })
      ensure(`${effect} empty content rejects inner pixels`, !emptyGate.inner)
    } else {
      ensure(`${effect} detached rejects blur`, !negative.blurred)
      ensure(`${effect} opaque wrong effect rejects backdrop`, !incorrect.backdrop)
      if (effect === 'edge-blur')
        ensure(
          'edge-blur opaque wrong effect rejects sharp inner pixels',
          !incorrect.inner
        )
      const zero = await capture(effect, 'zero')
      const zeroGate = gate(zero.image)
      record({ effect, variant: 'zero', result: zeroGate })
      ensure(`${effect} zero rejects blur`, !zeroGate.blurred)
      ensure(
        `${effect} zero retains sharp reference`,
        Math.abs(
          contrast(zero.image, 240, 190, 32) - contrast(bypass.image, 240, 190, 32)
        ) < 0.002
      )
      if (effect === 'blur') {
        const child = await capture(effect, 'wrong-child')
        const childGate = gate(child.image)
        record({
          effect,
          variant: 'wrong-child',
          result: childGate,
          childMAE: childDifference(child.image, bypass.image),
        })
        ensure('blur wrong foreground rejects sharp children', !childGate.child)
      }
    }
    const restored = await capture(effect, 'canonical')
    record({ effect, variant: 'restored', result: gate(restored.image) })
    for (const [name, accepted] of Object.entries(gate(restored.image)))
      ensure(`${effect} restored ${name}`, accepted)
  }
}
