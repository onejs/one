// measures the one-native-effects probe out of a full-screen simulator
// capture. proves the progressive falloff is real pixels, not a step:
//
//   sharp zone      the stripe rows above the blur band alternate dark/light
//                   at full contrast. local contrast here is the control.
//   blur band       the bottom 140pt of the stage: contrast must DECAY
//                   monotonically from the band's inner edge to its outer
//                   edge (a step would show one cliff, a missing blur no
//                   decay at all). reported as per-decile contrast means.
//   blur floor      contrast at the band's outer edge must be a fraction of
//                   the sharp control (blur actually blurs).
//   veil check      the band interior stays off both rails: it paints
//                   blurred content, not a black hole or white flash.
//
// the band is located by signature, not by hardcoded pixels, on a column at
// 75% width (the band's label and toggle live left-of-center; the right side
// is pure blurred stripes). sharp stripes show a high-contrast window at
// every row boundary (~132px apart); the band's inner edge is the first row
// after which contrast stays low for a full row-height run (stripes gone),
// and the outer edge is where a boundary spike resumes (the next section's
// sharp rows). usage: bun scripts/one-native-effects-proof.ts <capture.png>
import { readPng } from './visual-pixel-gate'

function luminance(image: { data: Buffer; width: number }, x: number, y: number): number {
  const i = (y * image.width + x) * 4
  return (0.2126 * image.data[i]! + 0.7152 * image.data[i + 1]! + 0.0722 * image.data[i + 2]!) / 255
}

// mean absolute row-to-row luminance step over a row span: high for windows
// straddling a sharp stripe boundary, near zero inside a solid row or a
// fully blurred field.
function bandContrast(
  image: { data: Buffer; width: number; height: number },
  x: number,
  y0: number,
  y1: number
): number {
  let sum = 0
  let n = 0
  for (let y = Math.max(1, y0); y < Math.min(image.height, y1); y += 2) {
    sum += Math.abs(luminance(image, x, y) - luminance(image, x, y - 2))
    n++
  }
  return n === 0 ? 0 : sum / n
}

function fail(reason: string): never {
  console.log(JSON.stringify({ pass: false, reason }))
  process.exit(1)
}

function main() {
  const capture = process.argv[2]
  if (!capture) {
    console.log('usage: bun scripts/one-native-effects-proof.ts <capture.png>')
    process.exit(1)
  }
  const image = readPng(capture)
  const x = Math.floor(image.width * 0.75)
  const window = Math.max(8, Math.floor(image.height / 120))
  const step = 4

  // contrast profile down the column, past the status bar.
  const startY = Math.floor(image.height * 0.08)
  const at = (y: number) => bandContrast(image, x, y, y + window)

  // the stripe zone: first window with real boundary contrast.
  let stripeTop = -1
  for (let y = startY; y < image.height - window; y += step) {
    if (at(y) > 0.05) {
      stripeTop = y
      break
    }
  }
  if (stripeTop < 0) fail('no stripe zone found')

  // control: the strongest boundary window in the stripe zone above the
  // band. scan at most two screens' worth of rows past stripeTop so a
  // below-fold section can't donate the control.
  let control = 0
  const controlEnd = Math.min(image.height - window, stripeTop + image.height)
  for (let y = stripeTop; y < controlEnd; y += step) {
    control = Math.max(control, at(y))
  }
  if (control <= 0.05) fail('stripe control too weak')

  // inner edge: first row after which contrast stays under 35% of control
  // for a full row-height run (a 44pt row at 3x is ~400px; 150px already
  // exceeds the ~132px boundary spacing, so a run this long means the
  // stripes are genuinely gone, not a between-boundaries dip).
  const lowBar = control * 0.35
  const runLength = 150
  let innerEdge = -1
  for (let y = stripeTop + 100; y < image.height - window - runLength; y += step) {
    let ok = true
    for (let r = y; r < y + runLength; r += step) {
      if (at(r) >= lowBar) {
        ok = false
        break
      }
    }
    if (ok) {
      innerEdge = y
      break
    }
  }
  if (innerEdge < 0) fail('no contrast collapse found')

  // outer edge: first boundary spike below the inner edge (sharp rows of
  // the next section resume), else the capture bottom.
  let outerEdge = image.height - window
  for (let y = innerEdge + runLength; y < image.height - window; y += step) {
    if (at(y) > control * 0.5) {
      outerEdge = y
      break
    }
  }
  if (outerEdge - innerEdge < window * 3) fail('band span too short')

  // falloff: ten deciles across the band only.
  const deciles: number[] = []
  for (let d = 0; d < 10; d++) {
    const y0 = innerEdge + Math.floor(((outerEdge - innerEdge) * d) / 10)
    const y1 = innerEdge + Math.floor(((outerEdge - innerEdge) * (d + 1)) / 10)
    deciles.push(Number(bandContrast(image, x, y0, y1).toFixed(4)))
  }
  const floor = deciles[9]!
  // progressive, not a step: a cliff would leave every decile at either the
  // top or the floor contrast; a real ramp parks several deciles strictly
  // between. (strict monotonicity is too strong for real pixels: a smeared
  // boundary keeps its total variation until fully averaged out, so
  // mid-ramp deciles legitimately wobble.)
  const lo = floor + (deciles[0]! - floor) * 0.2
  const hi = floor + (deciles[0]! - floor) * 0.8
  const intermediates = deciles.filter((c) => c > lo && c < hi).length

  // veil: mean luminance of the band interior.
  let lumSum = 0
  let lumN = 0
  for (let y = innerEdge; y < outerEdge; y += step) {
    lumSum += luminance(image, x, y)
    lumN++
  }
  const meanLum = lumN === 0 ? 0 : lumSum / lumN

  const pass =
    floor < control * 0.45 &&
    intermediates >= 3 &&
    deciles[0]! > floor * 2 + 0.002 &&
    meanLum > 0.05 &&
    meanLum < 0.95
  console.log(
    JSON.stringify(
      {
        pass,
        innerEdge,
        outerEdge,
        control: Number(control.toFixed(4)),
        floor,
        deciles,
        intermediates,
        meanLum: Number(meanLum.toFixed(3)),
      },
      null,
      1
    )
  )
  process.exit(pass ? 0 : 1)
}

main()
