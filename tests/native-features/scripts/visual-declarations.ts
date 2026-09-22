import type { PNG } from 'pngjs'
import {
  countDistinctColorsInCrop,
  countMatchingPixels,
  type Rect,
} from './visual-pixel-gate'

export interface VisualCheckDeclaration {
  /** Unique semantic identifier for the check */
  name: string
  /** Suite name matching one-native conformance suite */
  suite: string
  /** Subject description being graded */
  subject: string
  /** Positive capture screenshot (relative to suite dir or capture root) */
  positiveCapture: string
  /** Negative capture screenshot (natural opposite in corpus) where check MUST fail */
  negativeCapture: string
  /**
   * Resolves the crop from the subject frame saved beside anchor.capture at screenshot time.
   * The same resolved region grades both captures, so the negative cannot choose a more
   * convenient crop. Tab-bar geometry is intentionally measured by the separate pixel oracle,
   * because the accessibility snapshot exposes only the Tab Bar group.
   */
  anchor: VisualAnchor
  /** Semantic verification prompt (for advisory LLM inspection) */
  prompt: string
  /**
   * Deterministic directional measurement executed directly on the cropped region PNG.
   * Isolates the subject's visual feature (accent color, letterbox, capsule, text line, etc.)
   * without reliance on status text or symmetric changed pixels.
   */
  measureSubject: (crop: PNG) => number
  /** Minimum floor for the subject measurement. Positive MUST be >= this. Negative MUST be < this. */
  minSubjectFloor: number
  /** Documented empirical calibration measurements */
  calibration: {
    positiveMeasured: number | null
    negativeMeasured: number | null
    threshold: number
    changedPixelsMeasured: number | null
    crossSubstitutionMatches: number | null
    corpusSize: number
    nullStateReads: string
  }
}

export interface VisualAccessibilityNode {
  AXLabel?: string
  AXUniqueId?: string
  AXRole?: string
  role?: string
  subrole?: string
  type?: string
  frame?: Rect
}

export interface VisualAnchor {
  /** Capture whose at-capture accessibility snapshot owns the subject frame. */
  capture: string
  selector: Omit<VisualAccessibilityNode, 'frame'>
  region: (frame: Rect) => Rect
}

export function resolveVisualRegion(
  declaration: VisualCheckDeclaration,
  nodes: readonly VisualAccessibilityNode[]
): Rect {
  const matches = nodes.filter((node) =>
    Object.entries(declaration.anchor.selector).every(
      ([key, expected]) => node[key as keyof VisualAccessibilityNode] === expected
    )
  )
  if (matches.length !== 1 || !matches[0].frame) {
    throw new Error(
      `${declaration.name}: expected exactly one framed accessibility anchor ${JSON.stringify(declaration.anchor.selector)}, found ${matches.filter((node) => node.frame).length}`
    )
  }
  const region = declaration.anchor.region(matches[0].frame)
  if (
    ![region.x, region.y, region.width, region.height].every(Number.isFinite) ||
    region.width <= 0 ||
    region.height <= 0
  )
    throw new Error(
      `${declaration.name}: resolved an invalid visual region ${JSON.stringify(region)}`
    )
  return region
}

export const VISUAL_CHECKS: readonly VisualCheckDeclaration[] = [
  // ==========================================
  // Suite: map
  // ==========================================
  {
    name: 'map-markers',
    suite: 'map',
    subject: 'Map markers and pin callouts rendered over map view',
    positiveCapture: 'map/map-two-pins.png',
    negativeCapture: 'map/map-no-pins.png',
    anchor: {
      capture: 'map/map-two-pins.png',
      selector: { AXLabel: 'Map' },
      region: (frame) => frame,
    },
    prompt:
      'Custom red map marker pins or pin callouts are visible on the map, distinct from base Apple Maps POI icons.',
    measureSubject: (crop) =>
      countMatchingPixels(crop, (r, g, b) => r > 180 && g < 90 && b > 60 && b < 160),
    minSubjectFloor: 1_500,
    calibration: {
      positiveMeasured: 3_718,
      negativeMeasured: 356,
      threshold: 1_500,
      changedPixelsMeasured: 26_751,
      crossSubstitutionMatches: 2,
      corpusSize: 89,
      nullStateReads:
        'positive pin-tint 3,718, bar is 1,500, pin-free map reads 356 (~10x separation); 2/89 cross matches (both genuine pin maps)',
    },
  },
  {
    name: 'map-tiles',
    suite: 'map',
    subject: 'Rendered geographic map tiles showing roads, water, and terrain',
    positiveCapture: 'map/map-no-pins.png',
    negativeCapture: 'media/media-no-player.png',
    anchor: {
      capture: 'map/map-no-pins.png',
      selector: { AXLabel: 'Map' },
      region: (frame) => frame,
    },
    prompt:
      'Rendered geographic map tiles showing roads, water, or geographic map features are visible.',
    measureSubject: (crop) => countDistinctColorsInCrop(crop),
    minSubjectFloor: 8_000,
    calibration: {
      positiveMeasured: 14_813,
      negativeMeasured: 460,
      threshold: 8_000,
      changedPixelsMeasured: 716_096,
      crossSubstitutionMatches: 4,
      corpusSize: 89,
      nullStateReads:
        'rendered MapKit tile colours 14,813, bar is 8,000, unrendered screen reads 460 (~32x separation); 4/89 cross matches (all 4 genuine map screens)',
    },
  },

  // ==========================================
  // Suite: pickers
  // ==========================================
  {
    name: 'picker-segmented',
    suite: 'pickers',
    subject: 'Segmented control two-component track and thumb structure',
    positiveCapture: 'pickers/picker-segmented.png',
    negativeCapture: 'pickers/picker-wheel.png',
    anchor: {
      capture: 'pickers/picker-segmented.png',
      selector: { type: 'TabGroup' },
      region: (frame) => frame,
    },
    prompt:
      "A segmented control with three visible segments labeled 'Alpha', 'Beta', and 'Gamma' is present.",
    measureSubject: (crop) => {
      const track = countMatchingPixels(
        crop,
        (r, g, b) => r >= 225 && r <= 235 && g >= 225 && g <= 235 && b >= 228 && b <= 238
      )
      const thumb = countMatchingPixels(
        crop,
        (r, g, b) => r >= 250 && g >= 250 && b >= 250
      )
      return Math.floor(Math.min(track, thumb * 2.5))
    },
    minSubjectFloor: 40_000,
    calibration: {
      positiveMeasured: 67_857,
      negativeMeasured: 0,
      threshold: 40_000,
      changedPixelsMeasured: 102_194,
      crossSubstitutionMatches: 2,
      corpusSize: 89,
      nullStateReads:
        'two-colour structural score 67,857, bar is 40,000, wheel picker reads 0; 2/89 cross matches (both genuine segmented pickers)',
    },
  },
  {
    name: 'date-graphical',
    suite: 'pickers',
    subject: 'Graphical calendar month view with blue date selection accent badge',
    positiveCapture: 'pickers/date-graphical.png',
    negativeCapture: 'pickers/date-wheel.png',
    anchor: {
      capture: 'pickers/date-graphical.png',
      selector: { type: 'Group', AXLabel: 'Date' },
      region: (frame) => ({ x: frame.x + 265, y: frame.y + 149, width: 55, height: 55 }),
    },
    prompt:
      'A graphical calendar grid with month days and blue circular date selection accent is visible.',
    measureSubject: (crop) =>
      countMatchingPixels(crop, (r, g, b) => r < 30 && g >= 130 && g <= 145 && b > 240),
    minSubjectFloor: 5_000,
    calibration: {
      positiveMeasured: 12_485,
      negativeMeasured: 0,
      threshold: 5_000,
      changedPixelsMeasured: 14_665,
      crossSubstitutionMatches: 1,
      corpusSize: 89,
      nullStateReads:
        'calendar selection badge blue pixels 12,485, bar is 5,000, wheel picker reads 0; 1/89 cross matches (only date-graphical)',
    },
  },

  // ==========================================
  // Suite: forms
  // ==========================================
  {
    name: 'toggle-control',
    suite: 'forms',
    subject: 'Native Toggle switch capsule track and thumb structure',
    positiveCapture: 'forms/toggle-rejected.png',
    negativeCapture: 'forms/form-controls.png',
    anchor: {
      capture: 'forms/toggle-rejected.png',
      selector: { AXLabel: 'Enable notifications' },
      region: (frame) => ({
        x: frame.x + frame.width - 63,
        y: frame.y + (frame.height - 35) / 2,
        width: 60,
        height: 35,
      }),
    },
    prompt: 'A native iOS switch toggle capsule with round thumb is present.',
    measureSubject: (crop) => {
      const well = countMatchingPixels(
        crop,
        (r, g, b) =>
          Math.abs(r - 190) < 15 && Math.abs(g - 190) < 15 && Math.abs(b - 193) < 15
      )
      const thumb = countMatchingPixels(crop, (r, g, b) => r > 250 && g > 250 && b > 250)
      return Math.min(well, thumb)
    },
    minSubjectFloor: 3_000,
    calibration: {
      positiveMeasured: 6_632,
      negativeMeasured: 0,
      threshold: 3_000,
      changedPixelsMeasured: 13_837,
      crossSubstitutionMatches: 3,
      corpusSize: 89,
      nullStateReads:
        'switch capsule structural score 6,632, bar is 3,000, slider fixture reads 0; 3/89 cross matches (all 3 genuine off-state switches, checked by eye)',
    },
  },
  {
    name: 'slider-control',
    suite: 'forms',
    subject: 'Native Slider blue active track and grey inactive track structure',
    positiveCapture: 'forms/form-controls.png',
    negativeCapture: 'forms/toggle-rejected.png',
    anchor: {
      capture: 'forms/form-controls.png',
      selector: { AXLabel: 'Volume' },
      region: (frame) => ({
        x: frame.x,
        y: frame.y + (frame.height - 30) / 2,
        width: frame.width,
        height: 30,
      }),
    },
    prompt:
      'A horizontal volume slider track with a circular draggable thumb is present.',
    measureSubject: (crop) => {
      const blue = countMatchingPixels(
        crop,
        (r, g, b) => b > 200 && r < 50 && g > 90 && g < 180
      )
      const grey = countMatchingPixels(
        crop,
        (r, g, b) => r >= 215 && r <= 228 && g >= 215 && g <= 228 && b >= 218 && b <= 230
      )
      return Math.floor(Math.min(blue, grey / 2))
    },
    minSubjectFloor: 2_000,
    calibration: {
      positiveMeasured: 4_247,
      negativeMeasured: 0,
      threshold: 2_000,
      changedPixelsMeasured: 44_016,
      crossSubstitutionMatches: 1,
      corpusSize: 89,
      nullStateReads:
        'slider two-component score 4,247, bar is 2,000, toggle fixture reads 0; 1/89 cross matches (only form-controls)',
    },
  },
  {
    name: 'stepper-control',
    suite: 'forms',
    subject: 'Native Stepper capsule paint',
    positiveCapture: 'forms/stepper-enabled.png',
    negativeCapture: 'forms/toggle-rejected.png',
    anchor: {
      capture: 'forms/stepper-enabled.png',
      selector: { AXLabel: 'Guests, Increment' },
      region: (frame) => ({
        x: frame.x + frame.width - 100,
        y: frame.y,
        width: 100,
        height: frame.height,
      }),
    },
    prompt: 'A native stepper control capsule is painted.',
    measureSubject: (crop) =>
      countMatchingPixels(
        crop,
        (r, g, b) => r >= 220 && r <= 236 && g >= 220 && g <= 236 && b >= 225 && b <= 240
      ),
    minSubjectFloor: 15_000,
    calibration: {
      positiveMeasured: 23_849,
      negativeMeasured: 144,
      threshold: 15_000,
      changedPixelsMeasured: 25_217,
      crossSubstitutionMatches: 2,
      corpusSize: 89,
      nullStateReads:
        'stepper capsule pixels 23,849, bar is 15,000, toggle fixture reads 144 (~166x separation); 2/89 cross matches (both genuine stepper captures)',
    },
  },

  // ==========================================
  // Suite: sheets
  // ==========================================
  {
    name: 'sheet-presentation-paints',
    suite: 'sheets',
    subject: 'Presented modal bottom sheet white surface card paint presence',
    positiveCapture: 'sheets/sheet-open.png',
    negativeCapture: 'sheets/sheet-dismissed.png',
    anchor: {
      capture: 'sheets/sheet-open.png',
      // the sheet content View publishes no accessibility node, so the region is anchored to
      // the heading inside it, whose frame already spans the card's inset content width.
      selector: { AXLabel: 'Sheet Content' },
      region: (frame) => ({
        x: frame.x,
        y: frame.y + 125,
        width: frame.width,
        height: 200,
      }),
    },
    prompt:
      'A presented modal bottom sheet surface containing interactive buttons and text is visible.',
    measureSubject: (crop) =>
      countMatchingPixels(crop, (r, g, b) => r > 252 && g > 252 && b > 252),
    minSubjectFloor: 200_000,
    calibration: {
      positiveMeasured: 603_894,
      negativeMeasured: 0,
      threshold: 200_000,
      changedPixelsMeasured: 638_863,
      crossSubstitutionMatches: 17,
      corpusSize: 89,
      nullStateReads:
        'modal sheet white card pixels 603,894, bar is 200,000, dismissed screen reads 0; 17/89 cross matches (a surface-paint presence detector, not a sheet detector: it matches any large white card)',
    },
  },

  // ==========================================
  // Suite: tabs-menu
  // ==========================================
  {
    name: 'palette-menu',
    suite: 'tabs-menu',
    subject: 'Native context menu formatting palette Bold action button on card',
    positiveCapture: 'tabs-menu/04-palette-open.png',
    negativeCapture: 'tabs-menu/01-centered-trigger.png',
    anchor: {
      capture: 'tabs-menu/04-palette-open.png',
      selector: { AXLabel: 'Bold' },
      region: (frame) => ({
        x: frame.x + 20,
        y: frame.y + (frame.height - 30) / 2,
        width: 30,
        height: 30,
      }),
    },
    prompt:
      'A native context menu popup card containing action items including Bold and Italic is open and visible.',
    measureSubject: (crop) => {
      const card = countMatchingPixels(
        crop,
        (r, g, b) => r >= 247 && r <= 251 && g >= 247 && g <= 251 && b >= 247 && b <= 251
      )
      const text = countMatchingPixels(crop, (r, g, b) => r < 60 && g < 60 && b < 60)
      return Math.floor(Math.min(text, card / 10))
    },
    minSubjectFloor: 200,
    calibration: {
      positiveMeasured: 686,
      negativeMeasured: 0,
      threshold: 200,
      changedPixelsMeasured: 8_100,
      crossSubstitutionMatches: 2,
      corpusSize: 89,
      nullStateReads:
        'palette Bold icon score 686, bar is 200, closed trigger reads 0; 2/89 cross matches (both open context menu palettes)',
    },
  },

  // ==========================================
  // Suite: dialogs
  // ==========================================
  {
    name: 'alert-dialog',
    suite: 'dialogs',
    subject: 'SwiftUI Alert modal dialog card surface and centered title',
    positiveCapture: 'dialogs/alert-open.png',
    negativeCapture: 'dialogs/confirmation-automatic.png',
    anchor: {
      capture: 'dialogs/alert-open.png',
      selector: { AXLabel: 'One Native Alert' },
      region: (frame) => ({
        x: frame.x - 48,
        y: frame.y - 9,
        width: frame.width + 96,
        height: 60,
      }),
    },
    prompt:
      'A centered alert dialog card with title One Native Alert and action buttons is visible.',
    measureSubject: (crop) => {
      const card = countMatchingPixels(
        crop,
        (r, g, b) => r >= 235 && r <= 239 && g >= 235 && g <= 239 && b >= 236 && b <= 240
      )
      const title = countMatchingPixels(crop, (r, g, b) => r < 30 && g < 30 && b < 30)
      return Math.floor(Math.min(title, card / 20))
    },
    minSubjectFloor: 2_500,
    calibration: {
      positiveMeasured: 4_634,
      negativeMeasured: 1_167,
      threshold: 2_500,
      changedPixelsMeasured: 163_843,
      crossSubstitutionMatches: 2,
      corpusSize: 89,
      nullStateReads:
        'alert card and title score 4,634, bar is 2,500, non-alert screen reads 1,167 (~4x separation); 2/89 cross matches (both genuine alert dialogs)',
    },
  },
  {
    name: 'confirmation-title',
    suite: 'dialogs',
    subject: 'Confirmation dialog visible title header on dialog card',
    positiveCapture: 'dialogs/confirmation-visible.png',
    negativeCapture: 'dialogs/confirmation-hidden.png',
    anchor: {
      capture: 'dialogs/confirmation-visible.png',
      selector: { AXLabel: 'One Native Confirmation' },
      region: (frame) => ({ x: frame.x, y: frame.y, width: 90, height: 12 }),
    },
    prompt: 'A dialog card displaying the title Confirmation header is visible.',
    measureSubject: (crop) => {
      const card = countMatchingPixels(
        crop,
        (r, g, b) => r >= 241 && r <= 245 && g >= 241 && g <= 245 && b >= 242 && b <= 246
      )
      const text = countMatchingPixels(crop, (r, g, b) => r < 60 && g < 60 && b < 60)
      return Math.floor(Math.min(text, card / 3))
    },
    minSubjectFloor: 1_200,
    calibration: {
      positiveMeasured: 1_278,
      negativeMeasured: 0,
      threshold: 1_200,
      changedPixelsMeasured: 1_756,
      crossSubstitutionMatches: 1,
      corpusSize: 89,
      nullStateReads:
        'confirmation title text score 1,278, bar is 1,200, hidden title reads 0; 1/89 cross matches (only confirmation-visible). the worst margin in the suite at 6.5%, so it was measured rather than left alone: five independent captures read 1,278 every time, spread 0.00%, so the floor is sensitive rather than lucky and must not be lowered. run-to-run variance is what that rules out; a font or layout change would still move it.',
    },
  },

  // ==========================================
  // Suite: host
  // ==========================================
  {
    name: 'host-three-children',
    suite: 'host',
    subject: 'Composed button and stepper dynamically expanded into host container',
    positiveCapture: 'host/host-three-children.png',
    negativeCapture: 'host/host-one-child.png',
    anchor: {
      capture: 'host/host-three-children.png',
      // the Swift.Host publishes no node of its own, so the region is anchored to the composed
      // Toggle that is always its first child. the composed button and stepper this check
      // grades are the two rows directly below it.
      selector: { type: 'CheckBox', AXLabel: 'Toggle' },
      region: (frame) => ({
        x: frame.x,
        y: frame.y + frame.height,
        width: frame.width - 7,
        height: 45,
      }),
    },
    prompt: 'A composed stepper control is visible inside the host container.',
    measureSubject: (crop) => {
      // In physical pixels (3x): crop width = 1062 px.
      // Button text sits at x < 600 px (x < 200 pt), stepper sits at x > 750 px (x > 250 pt).
      let btn = 0
      let step = 0
      for (let y = 0; y < crop.height; y++) {
        for (let x = 0; x < crop.width; x++) {
          const idx = (crop.width * y + x) << 2
          const r = crop.data[idx]
          const g = crop.data[idx + 1]
          const b = crop.data[idx + 2]
          if (x < 600 && r < 50 && g > 90 && g < 180 && b > 200) btn++
          if (
            x > 750 &&
            r >= 220 &&
            r <= 236 &&
            g >= 220 &&
            g <= 236 &&
            b >= 225 &&
            b <= 240
          )
            step++
        }
      }
      return Math.floor(Math.min(btn, step / 5))
    },
    minSubjectFloor: 2_000,
    calibration: {
      positiveMeasured: 2_912,
      negativeMeasured: 0,
      threshold: 2_000,
      changedPixelsMeasured: 143_099,
      crossSubstitutionMatches: 1,
      corpusSize: 89,
      nullStateReads:
        'composed button and stepper score 2,912, bar is 2,000, one-child host reads 0; 1/89 cross matches (only host-three-children)',
    },
  },

  // ==========================================
  // Suite: containers
  // ==========================================
  {
    name: 'containers-second-section',
    suite: 'containers',
    subject:
      'Second form section with composed horizontal host row (dark label and blue button)',
    positiveCapture: 'containers/containers-two-sections.png',
    negativeCapture: 'containers/containers-one-section.png',
    anchor: {
      capture: 'containers/containers-two-sections.png',
      selector: { AXLabel: 'Host button' },
      region: (frame) => ({ x: 16, y: frame.y, width: 361, height: 25 }),
    },
    prompt:
      "A second form section with header 'More' containing a 'Section button' and horizontal host is present.",
    measureSubject: (crop) => {
      const dark = countMatchingPixels(crop, (r, g, b) => r < 60 && g < 60 && b < 60)
      const blue = countMatchingPixels(
        crop,
        (r, g, b) => r < 50 && g > 90 && g < 180 && b > 200
      )
      return Math.min(dark, blue)
    },
    minSubjectFloor: 1_500,
    calibration: {
      positiveMeasured: 2_396,
      negativeMeasured: 0,
      threshold: 1_500,
      changedPixelsMeasured: 74_978,
      crossSubstitutionMatches: 1,
      corpusSize: 89,
      nullStateReads:
        'composed Section 2 host row score 2,396, bar is 1,500, one-section screen reads 0; 1/89 cross matches (only containers-two-sections)',
    },
  },

  // ==========================================
  // Suite: popover
  // ==========================================
  {
    name: 'popover-balloon',
    suite: 'popover',
    subject: 'Presented popover balloon action button (#e8f0ff tinted chip)',
    positiveCapture: 'popover/popover-open.png',
    negativeCapture: 'popover/popover-closed.png',
    anchor: {
      capture: 'popover/popover-open.png',
      selector: { AXUniqueId: 'one-native-popover-tap' },
      region: (frame) => frame,
    },
    prompt: "A presented popover balloon containing 'Popover body' is visible.",
    measureSubject: (crop) =>
      countMatchingPixels(
        crop,
        (r, g, b) => r >= 230 && r <= 234 && g >= 238 && g <= 242 && b >= 253
      ),
    minSubjectFloor: 20_000,
    calibration: {
      positiveMeasured: 59_583,
      negativeMeasured: 0,
      threshold: 20_000,
      changedPixelsMeasured: 61_252,
      crossSubstitutionMatches: 1,
      corpusSize: 89,
      nullStateReads:
        'action button tinted pixels 59,583, bar is 20,000, closed popover reads 0; 1/89 cross matches (only popover-open)',
    },
  },

  // ==========================================
  // Suite: leaves
  // ==========================================
  {
    name: 'button-prominent-style',
    suite: 'leaves',
    subject: 'Prominent filled button solid red tinted background capsule',
    positiveCapture: 'leaves/button-borderedProminent.png',
    negativeCapture: 'leaves/button-plain.png',
    anchor: {
      capture: 'leaves/button-borderedProminent.png',
      selector: { AXLabel: 'Press leaf' },
      region: (frame) => ({ x: frame.x, y: frame.y, width: frame.width, height: 40 }),
    },
    prompt:
      "A prominent filled button with a solid tinted background capsule around 'Press leaf' is visible.",
    measureSubject: (crop) =>
      countMatchingPixels(crop, (r, g, b) => r > 180 && g < 80 && b < 80),
    minSubjectFloor: 8_000,
    calibration: {
      positiveMeasured: 28_017,
      negativeMeasured: 0,
      threshold: 8_000,
      changedPixelsMeasured: 31_340,
      crossSubstitutionMatches: 1,
      corpusSize: 89,
      nullStateReads:
        'red tinted capsule pixels 28,017, bar is 8,000, plain button reads 0; 1/89 cross matches (only button-borderedProminent)',
    },
  },
  {
    name: 'secure-field-bullets',
    suite: 'leaves',
    subject: 'Masked secret bullets inside text field with trailing empty field',
    positiveCapture: 'leaves/secure-masked.png',
    negativeCapture: 'leaves/text-rejected.png',
    anchor: {
      capture: 'leaves/secure-masked.png',
      selector: { type: 'TextField', subrole: 'AXSecureTextField' },
      region: (frame) => ({
        x: frame.x + 10,
        y: frame.y + frame.height / 2 - 4,
        width: 140,
        height: 8,
      }),
    },
    prompt:
      'A text field displaying masked bullet characters (dots) instead of plain letters is visible.',
    measureSubject: (crop) => {
      // In physical pixels (3x): crop width = 420 px.
      // 6 bullets sit at x < 180 px (x < 60 pt), trailing field sits at x >= 180 px.
      let bullets = 0
      let trailing = 0
      for (let y = 0; y < crop.height; y++) {
        for (let x = 0; x < crop.width; x++) {
          const idx = (crop.width * y + x) << 2
          const r = crop.data[idx]
          const g = crop.data[idx + 1]
          const b = crop.data[idx + 2]
          if (r < 30 && g < 30 && b < 30) {
            if (x < 180) bullets++
            else trailing++
          }
        }
      }
      return Math.max(0, bullets - trailing * 2)
    },
    minSubjectFloor: 1_200,
    calibration: {
      positiveMeasured: 1_958,
      negativeMeasured: 0,
      threshold: 1_200,
      changedPixelsMeasured: 3_316,
      crossSubstitutionMatches: 1,
      corpusSize: 89,
      nullStateReads:
        'centred masked bullet pixels 1,958, bar is 1,200, plain text field reads 0; 1/89 cross matches (only secure-masked)',
    },
  },

  // ==========================================
  // Suite: media
  // ==========================================
  {
    name: 'media-player',
    suite: 'media',
    subject: 'Native video player view surface letterbox bars',
    positiveCapture: 'media/media-player.png',
    negativeCapture: 'media/media-no-player.png',
    anchor: {
      capture: 'media/media-player.png',
      selector: { AXLabel: 'Video' },
      region: (frame) => frame,
    },
    prompt: 'A native video player view surface is present on screen.',
    measureSubject: (crop) =>
      countMatchingPixels(crop, (r, g, b) => r < 20 && g < 20 && b < 20),
    minSubjectFloor: 50_000,
    calibration: {
      positiveMeasured: 157_740,
      negativeMeasured: 0,
      threshold: 50_000,
      changedPixelsMeasured: 738_540,
      crossSubstitutionMatches: 2,
      corpusSize: 89,
      nullStateReads:
        'video player letterbox black pixels 157,740, bar is 50,000, no-player fixture reads 0; 2/89 cross matches (both genuine video player captures)',
    },
  },

  // ==========================================
  // Suite: accessibility
  // ==========================================
  {
    name: 'a11y-wrapped-text',
    suite: 'accessibility',
    subject: 'Multi-line wrapped paragraph text line 3 trailing edge (unclipped width)',
    positiveCapture: 'accessibility/a11y-wrapped-text.png',
    negativeCapture: 'accessibility/a11y-short-text.png',
    anchor: {
      capture: 'accessibility/a11y-wrapped-text.png',
      selector: { AXUniqueId: 'one-native-a11y-text' },
      // the paragraph wraps onto four lines and the fourth is short, so the bottom of the
      // frame has no trailing ink at all. line 3 is the last one that reaches the right edge,
      // which is the edge a clipped width would have taken away.
      region: (frame) => ({
        x: frame.x + frame.width - 127,
        y: frame.y + frame.height * 0.5 + 4,
        width: 110,
        height: 12,
      }),
    },
    prompt: 'A multi-line wrapped paragraph of text spanning several lines is visible.',
    measureSubject: (crop) =>
      countMatchingPixels(crop, (r, g, b) => r < 80 && g < 80 && b < 80),
    minSubjectFloor: 1_500,
    calibration: {
      positiveMeasured: 2_088,
      negativeMeasured: 0,
      threshold: 1_500,
      changedPixelsMeasured: 3_954,
      crossSubstitutionMatches: 1,
      corpusSize: 89,
      nullStateReads:
        'wrapped line 3 trailing edge dark pixels 2,088, bar is 1,500, short text reads 0; 1/89 cross matches (only a11y-wrapped-text)',
    },
  },
]
