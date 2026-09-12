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
   * Declared crop region in logical points (393x852). Status band is strictly excluded.
   *
   * These are absolute fixture coordinates, so anything that gains a row above the subject moves
   * every region below it. The controls fixture behind the pickers and forms suites moved 39pt,
   * one category-row pitch, when its category grid gained a seventh entry and wrapped to a third
   * row. A region left behind reports as "Control appears unpainted" or "0 pixels changed inside
   * region", which reads like a product regression and is not one: check the capture first.
   * Anchoring regions to the subject's accessibility frame would remove this class of failure.
   */
  region: Rect
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
    positiveMeasured: number
    negativeMeasured: number
    threshold: number
    changedPixelsMeasured: number
    crossSubstitutionMatches: number
    corpusSize: number
    nullStateReads: string
  }
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
    // Pure MapKit view area below status band: y: 248..468 pt
    region: { x: 10, y: 248, width: 373, height: 220 },
    prompt: 'Custom red map marker pins or pin callouts are visible on the map, distinct from base Apple Maps POI icons.',
    measureSubject: (crop) =>
      countMatchingPixels(
        crop,
        (r, g, b) => r > 180 && g < 90 && b > 60 && b < 160
      ),
    minSubjectFloor: 1_500,
    calibration: {
      positiveMeasured: 3_718,
      negativeMeasured: 356,
      threshold: 1_500,
      changedPixelsMeasured: 26_687,
      crossSubstitutionMatches: 2,
      corpusSize: 70,
      nullStateReads: 'positive pin-tint is 3,718, threshold is 1,500, negative pin-free map reads 356 (~10.4x separation); 2/70 cross matches (both genuine pin maps)',
    },
  },
  {
    name: 'map-tiles',
    suite: 'map',
    subject: 'Rendered geographic map tiles showing roads, water, and terrain',
    positiveCapture: 'map/map-no-pins.png',
    negativeCapture: 'media/media-no-player.png',
    region: { x: 10, y: 248, width: 373, height: 220 },
    prompt: 'Rendered geographic map tiles showing roads, water, or geographic map features are visible.',
    measureSubject: (crop) => countDistinctColorsInCrop(crop),
    minSubjectFloor: 8_000,
    calibration: {
      positiveMeasured: 14_893,
      negativeMeasured: 460,
      threshold: 8_000,
      changedPixelsMeasured: 714_973,
      crossSubstitutionMatches: 4,
      corpusSize: 70,
      nullStateReads: 'rendered MapKit tiles read 14,893 distinct colors, threshold is 8,000, unrendered screen reads 460 (~32x separation); 4/70 cross matches (all 4 genuine map screens)',
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
    // strictly the segmented control track: y: 320.33..352.33 pt
    region: { x: 10, y: 320.33, width: 373, height: 32 },
    prompt: "A segmented control with three visible segments labeled 'Alpha', 'Beta', and 'Gamma' is present.",
    measureSubject: (crop) => {
      const track = countMatchingPixels(
        crop,
        (r, g, b) =>
          r >= 225 && r <= 235 && g >= 225 && g <= 235 && b >= 228 && b <= 238
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
      changedPixelsMeasured: 105_309,
      crossSubstitutionMatches: 2,
      corpusSize: 70,
      nullStateReads: 'two-color structural score 67,857 (track: 73,874, thumb: 27,143), bar is 40,000, wheel picker reads 0; 2/70 cross matches (both genuine segmented pickers)',
    },
  },
  {
    name: 'date-graphical',
    suite: 'pickers',
    subject: 'Graphical calendar month view with blue date selection accent badge',
    positiveCapture: 'pickers/date-graphical.png',
    negativeCapture: 'pickers/date-wheel.png',
    // Tightened to the selected date circular badge: x: 275..330 pt, y: 430..485 pt
    region: { x: 275, y: 469, width: 55, height: 55 },
    prompt: 'A graphical calendar grid with month days and blue circular date selection accent is visible.',
    measureSubject: (crop) =>
      countMatchingPixels(
        crop,
        (r, g, b) => r < 30 && g >= 130 && g <= 145 && b > 240
      ),
    minSubjectFloor: 5_000,
    calibration: {
      positiveMeasured: 12_485,
      negativeMeasured: 0,
      threshold: 5_000,
      changedPixelsMeasured: 14_665,
      crossSubstitutionMatches: 1,
      corpusSize: 70,
      nullStateReads: 'calendar selection badge blue pixels 12,485, bar is 5,000, wheel picker reads 0; 1/70 cross matches (only date-graphical; 0 on segmented and sheets)',
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
    region: { x: 320, y: 289, width: 60, height: 35 },
    prompt: 'A native iOS switch toggle capsule with round thumb is present.',
    measureSubject: (crop) => {
      const well = countMatchingPixels(
        crop,
        (r, g, b) =>
          Math.abs(r - 190) < 15 && Math.abs(g - 190) < 15 && Math.abs(b - 193) < 15
      )
      const thumb = countMatchingPixels(
        crop,
        (r, g, b) => r > 250 && g > 250 && b > 250
      )
      return Math.min(well, thumb)
    },
    minSubjectFloor: 3_000,
    calibration: {
      positiveMeasured: 4_798,
      negativeMeasured: 0,
      threshold: 3_000,
      changedPixelsMeasured: 10_935,
      crossSubstitutionMatches: 3,
      corpusSize: 70,
      nullStateReads: 'switch capsule structural score 4,798 (well: 4,798, thumb: 5,742), bar is 3,000, slider fixture reads 0; 3/70 cross matches (all 3 genuine toggle switches)',
    },
  },
  {
    name: 'slider-control',
    suite: 'forms',
    subject: 'Native Slider blue active track and grey inactive track structure',
    positiveCapture: 'forms/form-controls.png',
    negativeCapture: 'forms/toggle-rejected.png',
    region: { x: 10, y: 289, width: 373, height: 30 },
    prompt: 'A horizontal volume slider track with a circular draggable thumb is present.',
    measureSubject: (crop) => {
      const blue = countMatchingPixels(
        crop,
        (r, g, b) => b > 200 && r < 50 && g > 90 && g < 180
      )
      const grey = countMatchingPixels(
        crop,
        (r, g, b) =>
          r >= 215 && r <= 228 && g >= 215 && g <= 228 && b >= 218 && b <= 230
      )
      return Math.floor(Math.min(blue, grey / 2))
    },
    minSubjectFloor: 2_000,
    calibration: {
      positiveMeasured: 4_248,
      negativeMeasured: 0,
      threshold: 2_000,
      changedPixelsMeasured: 41_701,
      crossSubstitutionMatches: 1,
      corpusSize: 70,
      nullStateReads: 'slider two-component score 4,248 (blue track: 4,248, grey track: 12,909), bar is 2,000, toggle fixture reads 0; 1/70 cross matches (only form-controls)',
    },
  },
  {
    name: 'stepper-control',
    suite: 'forms',
    subject: 'Native Stepper capsule with increment/decrement glyphs',
    positiveCapture: 'forms/stepper-upper-bound.png',
    negativeCapture: 'forms/toggle-rejected.png',
    region: { x: 280, y: 284, width: 100, height: 35 },
    prompt: 'A native stepper control capsule with minus and plus buttons is present.',
    measureSubject: (crop) => {
      const pill = countMatchingPixels(
        crop,
        (r, g, b) =>
          r >= 220 && r <= 236 && g >= 220 && g <= 236 && b >= 225 && b <= 240
      )
      const glyph = countMatchingPixels(
        crop,
        (r, g, b) => r < 60 && g < 60 && b < 60
      )
      return pill >= 15_000 ? glyph : 0
    },
    minSubjectFloor: 100,
    calibration: {
      positiveMeasured: 188,
      negativeMeasured: 0,
      threshold: 100,
      changedPixelsMeasured: 23_823,
      crossSubstitutionMatches: 1,
      corpusSize: 70,
      nullStateReads: 'stepper capsule glyph score 188 (pill: 22,735, glyphs: 188), bar is 100, toggle fixture reads 0; 1/70 cross matches (only stepper-upper-bound)',
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
    // Sheet card surface well below top status band: y: 550..750 pt
    region: { x: 20, y: 550, width: 353, height: 200 },
    prompt: 'A presented modal bottom sheet surface containing interactive buttons and text is visible.',
    measureSubject: (crop) =>
      countMatchingPixels(crop, (r, g, b) => r > 252 && g > 252 && b > 252),
    minSubjectFloor: 200_000,
    calibration: {
      positiveMeasured: 630_655,
      negativeMeasured: 0,
      threshold: 200_000,
      changedPixelsMeasured: 635_400,
      crossSubstitutionMatches: 16,
      corpusSize: 70,
      nullStateReads: 'modal sheet pure white card pixels 630,655, bar is 200,000, dismissed screen reads 0; 16/70 cross matches (honest surface paint presence detector)',
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
    // Bold action button inside formatting palette row: x: 40..70 pt, y: 500..530 pt
    region: { x: 40, y: 500, width: 30, height: 30 },
    prompt: 'A native context menu popup card containing action items including Bold and Italic is open and visible.',
    measureSubject: (crop) => {
      const card = countMatchingPixels(
        crop,
        (r, g, b) =>
          r >= 247 && r <= 251 && g >= 247 && g <= 251 && b >= 247 && b <= 251
      )
      const text = countMatchingPixels(
        crop,
        (r, g, b) => r < 60 && g < 60 && b < 60
      )
      return Math.floor(Math.min(text, card / 10))
    },
    minSubjectFloor: 200,
    calibration: {
      positiveMeasured: 252,
      negativeMeasured: 0,
      threshold: 200,
      changedPixelsMeasured: 5_484,
      crossSubstitutionMatches: 2,
      corpusSize: 70,
      nullStateReads: 'palette Bold icon score 252 (card: 2,525, icon: 625), bar is 200, closed trigger reads 0; 2/70 cross matches (both open context menu palettes)',
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
    region: { x: 60, y: 310, width: 273, height: 60 },
    prompt: 'A centered alert dialog card with title One Native Alert and action buttons is visible.',
    measureSubject: (crop) => {
      const card = countMatchingPixels(
        crop,
        (r, g, b) =>
          r >= 235 && r <= 239 && g >= 235 && g <= 239 && b >= 236 && b <= 240
      )
      const title = countMatchingPixels(
        crop,
        (r, g, b) => r < 30 && g < 30 && b < 30
      )
      return Math.floor(Math.min(title, card / 20))
    },
    minSubjectFloor: 2_500,
    calibration: {
      positiveMeasured: 4_634,
      negativeMeasured: 534,
      threshold: 2_500,
      changedPixelsMeasured: 130_748,
      crossSubstitutionMatches: 2,
      corpusSize: 70,
      nullStateReads: 'alert card+title score 4,634 (card: 134,897, title: 4,634), bar is 2,500, non-alert screen reads 534; 2/70 cross matches (both genuine alert dialogs)',
    },
  },
  {
    name: 'confirmation-title',
    suite: 'dialogs',
    subject: 'Confirmation dialog visible title header on dialog card',
    positiveCapture: 'dialogs/confirmation-visible.png',
    negativeCapture: 'dialogs/confirmation-hidden.png',
    // Popover title text area: x: 80..170 pt, y: 276..288 pt
    region: { x: 80, y: 276, width: 90, height: 12 },
    prompt: 'A dialog card displaying the title Confirmation header is visible.',
    measureSubject: (crop) => {
      const card = countMatchingPixels(
        crop,
        (r, g, b) =>
          r >= 241 && r <= 245 && g >= 241 && g <= 245 && b >= 242 && b <= 246
      )
      const text = countMatchingPixels(
        crop,
        (r, g, b) => r < 60 && g < 60 && b < 60
      )
      return Math.floor(Math.min(text, card / 3))
    },
    minSubjectFloor: 1_200,
    calibration: {
      positiveMeasured: 2_150,
      negativeMeasured: 0,
      threshold: 1_200,
      changedPixelsMeasured: 3_263,
      crossSubstitutionMatches: 1,
      corpusSize: 70,
      nullStateReads: 'confirmation title header text score 2,150 (card: 6,452, text: 2,492), bar is 1,200, hidden title reads 0; 1/70 cross matches (only confirmation-visible)',
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
    // Host composed children area: x: 16..370 pt, y: 290..335 pt
    region: { x: 16, y: 290, width: 354, height: 45 },
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
      positiveMeasured: 3_655,
      negativeMeasured: 0,
      threshold: 2_000,
      changedPixelsMeasured: 143_012,
      crossSubstitutionMatches: 1,
      corpusSize: 70,
      nullStateReads: 'composed button + stepper score 3,655 (button: 3,756, stepper: 18,278), bar is 2,000, one-child host reads 0; 1/70 cross matches (only host-three-children)',
    },
  },

  // ==========================================
  // Suite: containers
  // ==========================================
  {
    name: 'containers-second-section',
    suite: 'containers',
    subject: 'Second form section with composed horizontal host row (dark label and blue button)',
    positiveCapture: 'containers/containers-two-sections.png',
    negativeCapture: 'containers/containers-one-section.png',
    // Composed host row inside Section 2: x: 16..377 pt, y: 700..725 pt
    region: { x: 16, y: 700, width: 361, height: 25 },
    prompt: "A second form section with header 'More' containing a 'Section button' and horizontal host is present.",
    measureSubject: (crop) => {
      const dark = countMatchingPixels(
        crop,
        (r, g, b) => r < 60 && g < 60 && b < 60
      )
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
      changedPixelsMeasured: 73_947,
      crossSubstitutionMatches: 1,
      corpusSize: 70,
      nullStateReads: 'composed Section 2 host row score 2,396 (dark: 2,934, blue: 2,396), bar is 1,500, one-section screen reads 0; 1/70 cross matches (only containers-two-sections)',
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
    // Popover balloon body content: x: 50..290 pt, y: 250..400 pt
    region: { x: 50, y: 250, width: 240, height: 150 },
    prompt: "A presented popover balloon containing 'Popover body' is visible.",
    measureSubject: (crop) =>
      countMatchingPixels(
        crop,
        (r, g, b) =>
          r >= 230 && r <= 234 && g >= 238 && g <= 242 && b >= 253
      ),
    minSubjectFloor: 20_000,
    calibration: {
      positiveMeasured: 106_591,
      negativeMeasured: 0,
      threshold: 20_000,
      changedPixelsMeasured: 261_990,
      crossSubstitutionMatches: 1,
      corpusSize: 70,
      nullStateReads: 'action button #e8f0ff tinted pixels 106,591, bar is 20,000, closed popover reads 0; 1/70 cross matches (only popover-open)',
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
    region: { x: 10, y: 275, width: 373, height: 40 },
    prompt: "A prominent filled button with a solid tinted background capsule around 'Press leaf' is visible.",
    measureSubject: (crop) =>
      countMatchingPixels(crop, (r, g, b) => r > 180 && g < 80 && b < 80),
    minSubjectFloor: 8_000,
    calibration: {
      positiveMeasured: 15_916,
      negativeMeasured: 0,
      threshold: 8_000,
      changedPixelsMeasured: 21_710,
      crossSubstitutionMatches: 1,
      corpusSize: 70,
      nullStateReads: 'red tinted capsule pixels 15,916, bar is 8,000, plain button reads 0; 1/70 cross matches (only button-borderedProminent)',
    },
  },
  {
    name: 'secure-field-bullets',
    suite: 'leaves',
    subject: 'Masked secret bullets inside text field with trailing empty field',
    positiveCapture: 'leaves/secure-masked.png',
    negativeCapture: 'leaves/text-rejected.png',
    // Bullet cluster and trailing blank space: x: 20..160 pt, y: 304..312 pt
    region: { x: 20, y: 304, width: 140, height: 8 },
    prompt: 'A text field displaying masked bullet characters (dots) instead of plain letters is visible.',
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
      changedPixelsMeasured: 3_321,
      crossSubstitutionMatches: 1,
      corpusSize: 70,
      nullStateReads: 'centered masked bullet pixels 1,958, bar is 1,200, plain text field reads 0; 1/70 cross matches (only secure-masked)',
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
    region: { x: 10, y: 248, width: 373, height: 220 },
    prompt: 'A native video player view surface is present on screen.',
    measureSubject: (crop) =>
      countMatchingPixels(crop, (r, g, b) => r < 20 && g < 20 && b < 20),
    minSubjectFloor: 50_000,
    calibration: {
      positiveMeasured: 108_745,
      negativeMeasured: 0,
      threshold: 50_000,
      changedPixelsMeasured: 546_453,
      crossSubstitutionMatches: 2,
      corpusSize: 70,
      nullStateReads: 'video player letterbox black pixels 108,745, bar is 50,000, no-player fixture reads 0; 2/70 cross matches (both genuine video player captures)',
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
    // Line 3 right-side span of wrapped paragraph: x: 250..360 pt, y: 280..292 pt
    region: { x: 250, y: 280, width: 110, height: 12 },
    prompt: 'A multi-line wrapped paragraph of text spanning several lines is visible.',
    measureSubject: (crop) =>
      countMatchingPixels(crop, (r, g, b) => r < 80 && g < 80 && b < 80),
    minSubjectFloor: 1_500,
    calibration: {
      positiveMeasured: 2_926,
      negativeMeasured: 0,
      threshold: 1_500,
      changedPixelsMeasured: 6_451,
      crossSubstitutionMatches: 1,
      corpusSize: 70,
      nullStateReads: 'wrapped line 3 trailing edge dark text pixels 2,926, bar is 1,500, short text reads 0; 1/70 cross matches (only a11y-wrapped-text)',
    },
  },
]
