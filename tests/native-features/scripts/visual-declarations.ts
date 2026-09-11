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
  /** Declared crop region in logical points (393x852). Status band is strictly excluded. */
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
      nullStateReads: 'positive pin-tint is 3,718, threshold is 1,500, negative pin-free map reads 356 (~10.4x separation)',
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
    minSubjectFloor: 3_000,
    calibration: {
      positiveMeasured: 14_893,
      negativeMeasured: 460,
      threshold: 3_000,
      changedPixelsMeasured: 480_508,
      nullStateReads: 'rendered MapKit tiles read 14,893 distinct colors, threshold is 3,000, unrendered screen reads 460 (~32x separation)',
    },
  },

  // ==========================================
  // Suite: pickers
  // ==========================================
  {
    name: 'picker-segmented',
    suite: 'pickers',
    subject: 'Segmented control with three visible segments (Alpha, Beta, Gamma)',
    positiveCapture: 'pickers/picker-segmented.png',
    negativeCapture: 'pickers/picker-wheel.png',
    // Tightened strictly to segmented control track: y: 281.33..313.33 pt
    region: { x: 10, y: 281.33, width: 373, height: 32 },
    prompt: "A segmented control with three visible segments labeled 'Alpha', 'Beta', and 'Gamma' is present.",
    measureSubject: (crop) =>
      countMatchingPixels(
        crop,
        (r, g, b) =>
          Math.abs(r - 245) > 10 || Math.abs(g - 245) > 10 || Math.abs(b - 247) > 10
      ),
    minSubjectFloor: 30_000,
    calibration: {
      positiveMeasured: 77_885,
      negativeMeasured: 0,
      threshold: 30_000,
      changedPixelsMeasured: 104_998,
      nullStateReads: 'segmented control non-background pixels 77,885, bar is 30,000, wheel picker reads 0',
    },
  },
  {
    name: 'date-graphical',
    suite: 'pickers',
    subject: 'Graphical calendar month view with blue date selection accent',
    positiveCapture: 'pickers/date-graphical.png',
    negativeCapture: 'pickers/date-wheel.png',
    // Tightened to month grid: y: 350..510 pt
    region: { x: 20, y: 350, width: 353, height: 160 },
    prompt: 'A graphical calendar grid with month days and blue circular date selection accent is visible.',
    measureSubject: (crop) =>
      countMatchingPixels(
        crop,
        (r, g, b) => r < 40 && g > 100 && g < 170 && b > 220
      ),
    minSubjectFloor: 5_000,
    calibration: {
      positiveMeasured: 12_563,
      negativeMeasured: 0,
      threshold: 5_000,
      changedPixelsMeasured: 185_409,
      nullStateReads: 'calendar selection blue accent pixels 12,563, bar is 5,000, wheel picker reads 0',
    },
  },

  // ==========================================
  // Suite: forms
  // ==========================================
  {
    name: 'toggle-control',
    suite: 'forms',
    subject: 'Native Toggle switch capsule',
    positiveCapture: 'forms/toggle-rejected.png',
    negativeCapture: 'forms/form-controls.png',
    region: { x: 320, y: 250, width: 60, height: 35 },
    prompt: 'A native iOS switch toggle capsule with round thumb is present.',
    measureSubject: (crop) =>
      countMatchingPixels(
        crop,
        (r, g, b) =>
          Math.abs(r - 190) < 15 && Math.abs(g - 190) < 15 && Math.abs(b - 193) < 15
      ),
    minSubjectFloor: 2_000,
    calibration: {
      positiveMeasured: 4_798,
      negativeMeasured: 162,
      threshold: 2_000,
      changedPixelsMeasured: 5_641,
      nullStateReads: 'switch capsule track pixels 4,798, bar is 2,000, slider fixture reads 162 (~29x separation)',
    },
  },
  {
    name: 'slider-control',
    suite: 'forms',
    subject: 'Native Slider track and thumb',
    positiveCapture: 'forms/form-controls.png',
    negativeCapture: 'forms/toggle-rejected.png',
    region: { x: 10, y: 250, width: 373, height: 30 },
    prompt: 'A horizontal volume slider track with a circular draggable thumb is present.',
    measureSubject: (crop) =>
      countMatchingPixels(
        crop,
        (r, g, b) => b > 200 && r < 50 && g > 90 && g < 180
      ),
    minSubjectFloor: 2_000,
    calibration: {
      positiveMeasured: 4_248,
      negativeMeasured: 0,
      threshold: 2_000,
      changedPixelsMeasured: 38_554,
      nullStateReads: 'slider blue filled track pixels 4,248, bar is 2,000, toggle fixture reads 0',
    },
  },
  {
    name: 'stepper-control',
    suite: 'forms',
    subject: 'Native Stepper increment/decrement buttons',
    positiveCapture: 'forms/stepper-upper-bound.png',
    negativeCapture: 'forms/toggle-rejected.png',
    region: { x: 280, y: 245, width: 100, height: 35 },
    prompt: 'A native stepper control capsule with minus and plus buttons is present.',
    measureSubject: (crop) =>
      countMatchingPixels(
        crop,
        (r, g, b) =>
          r >= 220 && r <= 236 && g >= 220 && g <= 236 && b >= 225 && b <= 240
      ),
    minSubjectFloor: 10_000,
    calibration: {
      positiveMeasured: 22_735,
      negativeMeasured: 134,
      threshold: 10_000,
      changedPixelsMeasured: 23_663,
      nullStateReads: 'stepper capsule pixels 22,735, bar is 10,000, toggle fixture reads 134 (~170x separation)',
    },
  },

  // ==========================================
  // Suite: sheets
  // ==========================================
  {
    name: 'sheet-presentation',
    suite: 'sheets',
    subject: 'Presented modal sheet surface',
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
      changedPixelsMeasured: 1_493_822,
      nullStateReads: 'modal sheet pure white card pixels 630,655, bar is 200,000, dismissed screen reads 0',
    },
  },

  // ==========================================
  // Suite: tabs-menu
  // ==========================================
  {
    name: 'palette-menu',
    suite: 'tabs-menu',
    subject: 'Native context menu formatting palette action row',
    positiveCapture: 'tabs-menu/04-palette-open.png',
    negativeCapture: 'tabs-menu/01-centered-trigger.png',
    // Tools palette row at bottom of menu card: y: 500..530 pt
    region: { x: 40, y: 500, width: 280, height: 30 },
    prompt: 'A native context menu popup card containing action items including Bold and Italic is open and visible.',
    measureSubject: (crop) =>
      countMatchingPixels(crop, (r, g, b) => r < 60 && g < 60 && b < 60),
    minSubjectFloor: 800,
    calibration: {
      positiveMeasured: 1_578,
      negativeMeasured: 0,
      threshold: 800,
      changedPixelsMeasured: 260_692,
      nullStateReads: 'palette row text and icon pixels 1,578, bar is 800, closed trigger reads 0',
    },
  },

  // ==========================================
  // Suite: dialogs
  // ==========================================
  {
    name: 'alert-dialog',
    suite: 'dialogs',
    subject: 'SwiftUI Alert modal dialog title',
    positiveCapture: 'dialogs/alert-open.png',
    negativeCapture: 'dialogs/confirmation-automatic.png',
    region: { x: 80, y: 328, width: 233, height: 12 },
    prompt: 'A centered alert dialog card with title One Native Alert and action buttons is visible.',
    measureSubject: (crop) =>
      countMatchingPixels(crop, (r, g, b) => r < 60 && g < 60 && b < 60),
    minSubjectFloor: 800,
    calibration: {
      positiveMeasured: 2_353,
      negativeMeasured: 132,
      threshold: 800,
      changedPixelsMeasured: 221_282,
      nullStateReads: 'alert title text pixels 2,353, bar is 800, non-alert screen reads 132 (~17x separation)',
    },
  },
  {
    name: 'confirmation-title',
    suite: 'dialogs',
    subject: 'Confirmation dialog visible title header text',
    positiveCapture: 'dialogs/confirmation-visible.png',
    negativeCapture: 'dialogs/confirmation-hidden.png',
    // Popover title text row: y: 276..288 pt
    region: { x: 50, y: 276, width: 230, height: 12 },
    prompt: 'A dialog card displaying the title Confirmation header is visible.',
    measureSubject: (crop) =>
      countMatchingPixels(crop, (r, g, b) => r < 60 && g < 60 && b < 60),
    minSubjectFloor: 1_500,
    calibration: {
      positiveMeasured: 2_492,
      negativeMeasured: 0,
      threshold: 1_500,
      changedPixelsMeasured: 38_207,
      nullStateReads: 'confirmation title header text pixels 2,492, bar is 1,500, hidden title reads 0',
    },
  },

  // ==========================================
  // Suite: host
  // ==========================================
  {
    name: 'host-three-children',
    suite: 'host',
    subject: 'Composed stepper in host container',
    positiveCapture: 'host/host-three-children.png',
    negativeCapture: 'host/host-one-child.png',
    // Host composed stepper area: y: 290..335 pt
    region: { x: 270, y: 290, width: 100, height: 45 },
    prompt: 'A composed stepper control is visible inside the host container.',
    measureSubject: (crop) =>
      countMatchingPixels(
        crop,
        (r, g, b) =>
          r >= 220 && r <= 236 && g >= 220 && g <= 236 && b >= 225 && b <= 240
      ),
    minSubjectFloor: 8_000,
    calibration: {
      positiveMeasured: 18_278,
      negativeMeasured: 0,
      threshold: 8_000,
      changedPixelsMeasured: 236_195,
      nullStateReads: 'composed stepper capsule pixels 18,278, bar is 8,000, one-child host reads 0',
    },
  },

  // ==========================================
  // Suite: containers
  // ==========================================
  {
    name: 'containers-second-section',
    suite: 'containers',
    subject: 'Second form section More with Section button',
    positiveCapture: 'containers/containers-two-sections.png',
    negativeCapture: 'containers/containers-one-section.png',
    // Pure section 2 form area: y: 600..750 pt
    region: { x: 16, y: 600, width: 361, height: 150 },
    prompt: "A second form section with header 'More' containing a 'Section button' and horizontal host is present.",
    measureSubject: (crop) =>
      countMatchingPixels(crop, (r, g, b) => r > 252 && g > 252 && b > 252),
    minSubjectFloor: 100_000,
    calibration: {
      positiveMeasured: 300_888,
      negativeMeasured: 0,
      threshold: 100_000,
      changedPixelsMeasured: 317_948,
      nullStateReads: 'section 2 pure white form card pixels 300,888, bar is 100,000, one-section screen reads 0',
    },
  },

  // ==========================================
  // Suite: popover
  // ==========================================
  {
    name: 'popover-balloon',
    suite: 'popover',
    subject: 'Presented popover balloon body text',
    positiveCapture: 'popover/popover-open.png',
    negativeCapture: 'popover/popover-closed.png',
    // Popover body text line inside balloon: y: 270..295 pt
    region: { x: 50, y: 270, width: 200, height: 25 },
    prompt: "A presented popover balloon containing 'Popover body' is visible.",
    measureSubject: (crop) =>
      countMatchingPixels(crop, (r, g, b) => r < 60 && g < 60 && b < 60),
    minSubjectFloor: 800,
    calibration: {
      positiveMeasured: 1_265,
      negativeMeasured: 0,
      threshold: 800,
      changedPixelsMeasured: 645_985,
      nullStateReads: 'popover body text pixels 1,265, bar is 800, closed popover reads 0',
    },
  },

  // ==========================================
  // Suite: leaves
  // ==========================================
  {
    name: 'button-prominent-style',
    suite: 'leaves',
    subject: 'Prominent filled button background capsule',
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
      changedPixelsMeasured: 21_579,
      nullStateReads: 'red tinted capsule pixels 15,916, bar is 8,000, plain button reads 0',
    },
  },
  {
    name: 'secure-field-bullets',
    suite: 'leaves',
    subject: 'Masked secret bullets inside text field',
    positiveCapture: 'leaves/secure-masked.png',
    negativeCapture: 'leaves/text-rejected.png',
    region: { x: 20, y: 295, width: 200, height: 25 },
    prompt: 'A text field displaying masked bullet characters (dots) instead of plain letters is visible.',
    measureSubject: (crop) =>
      countMatchingPixels(
        crop,
        (r, g, b, _a, _x, y) =>
          y >= 25 && y <= 55 && r < 30 && g < 30 && b < 30
      ),
    minSubjectFloor: 1_000,
    calibration: {
      positiveMeasured: 1_958,
      negativeMeasured: 0,
      threshold: 1_000,
      changedPixelsMeasured: 35_710,
      nullStateReads: 'centered masked bullet pixels 1,958, bar is 1,000, plain text field reads 0',
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
      changedPixelsMeasured: 328_551,
      nullStateReads: 'video player letterbox black pixels 108,745, bar is 50,000, no-player fixture reads 0',
    },
  },

  // ==========================================
  // Suite: accessibility
  // ==========================================
  {
    name: 'a11y-wrapped-text',
    suite: 'accessibility',
    subject: 'Multi-line wrapped paragraph text line 3',
    positiveCapture: 'accessibility/a11y-wrapped-text.png',
    negativeCapture: 'accessibility/a11y-short-text.png',
    // Line 3 of wrapped paragraph: y: 248..262 pt
    region: { x: 16, y: 248, width: 361, height: 14 },
    prompt: 'A multi-line wrapped paragraph of text spanning several lines is visible.',
    measureSubject: (crop) =>
      countMatchingPixels(crop, (r, g, b) => r < 80 && g < 80 && b < 80),
    minSubjectFloor: 2_500,
    calibration: {
      positiveMeasured: 6_740,
      negativeMeasured: 113,
      threshold: 2_500,
      changedPixelsMeasured: 55_099,
      nullStateReads: 'wrapped line 3 dark text pixels 6,740, bar is 2,500, short text reads 113 (~60x separation)',
    },
  },
]
