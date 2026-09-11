import type { Rect } from './visual-pixel-gate'

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
  /** Declared crop region in logical points (393x852) */
  region: Rect
  /** Precise verification prompt evaluated by Gemini Oracle */
  prompt: string
  /** Gating assertion: minimum changed pixels required between positive and negative pair */
  minChangedPixels: number
  /** Gating assertion: minimum ink / non-background pixels in positive capture */
  minInkPixels: number
  /** Gating assertion: minimum distinct RGB colors in positive capture */
  minDistinctColors: number
  /** Documented empirical calibration measurements */
  calibration: {
    changedPixelsMeasured: number
    totalPixels: number
    changedRatio: number
    positiveInkMeasured: number
    positiveColorsMeasured: number
    negativeInkMeasured: number
    negativeColorsMeasured: number
    nullStateReads: string
  }
}

export const VISUAL_CHECKS: readonly VisualCheckDeclaration[] = [
  // ==========================================
  // Suite: pickers
  // ==========================================
  {
    name: 'picker-segmented',
    suite: 'pickers',
    subject: 'Segmented control with three visible segments (Alpha, Beta, Gamma)',
    positiveCapture: 'pickers/picker-segmented.png',
    negativeCapture: 'pickers/picker-wheel.png',
    region: { x: 10, y: 281.33, width: 373, height: 32 },
    prompt: "A segmented control with three visible segments labeled 'Alpha', 'Beta', and 'Gamma' is present in this region.",
    // Rule 2: 104,998 of 108,543 changed pixels (96.7%) between picker-segmented and picker-wheel
    // Rule 3: weakest real cell 34,584 of 108,543, bar is 10,000, a missing control reads 0
    minChangedPixels: 50_000,
    minInkPixels: 10_000,
    minDistinctColors: 50,
    calibration: {
      changedPixelsMeasured: 104_998,
      totalPixels: 108_543,
      changedRatio: 0.967,
      positiveInkMeasured: 34_584,
      positiveColorsMeasured: 427,
      negativeInkMeasured: 0,
      negativeColorsMeasured: 1,
      nullStateReads: 'weakest real cell 34,584 of 108,543, bar is 10,000, a missing control reads 0',
    },
  },
  {
    name: 'date-graphical',
    suite: 'pickers',
    subject: 'Graphical calendar month view grid',
    positiveCapture: 'pickers/date-graphical.png',
    negativeCapture: 'pickers/date-wheel.png',
    region: { x: 12, y: 286.67, width: 360, height: 286.67 },
    prompt: 'A graphical calendar grid with month days is visible.',
    // Rule 2: 185,409 of 929,880 changed pixels (19.9%) between date-graphical and date-wheel
    // Rule 3: weakest real cell 54,367 of 929,880, bar is 20,000, a missing control reads 0
    minChangedPixels: 50_000,
    minInkPixels: 20_000,
    minDistinctColors: 200,
    calibration: {
      changedPixelsMeasured: 185_409,
      totalPixels: 929_880,
      changedRatio: 0.199,
      positiveInkMeasured: 54_367,
      positiveColorsMeasured: 905,
      negativeInkMeasured: 137_125,
      negativeColorsMeasured: 872,
      nullStateReads: 'weakest real cell 54,367 of 929,880, bar is 20,000, a missing control reads 0',
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
    region: { x: 320, y: 260, width: 60, height: 40 },
    prompt: 'A native iOS switch toggle capsule with round thumb is present.',
    // Rule 2: 5,641 of 21,600 changed pixels (26.1%) between toggle-rejected and form-controls
    // Rule 3: weakest real cell 5,585 of 21,600, bar is 2,000, a missing control reads 0
    minChangedPixels: 2_000,
    minInkPixels: 2_000,
    minDistinctColors: 50,
    calibration: {
      changedPixelsMeasured: 5_641,
      totalPixels: 21_600,
      changedRatio: 0.261,
      positiveInkMeasured: 5_585,
      positiveColorsMeasured: 176,
      negativeInkMeasured: 1_296,
      negativeColorsMeasured: 16,
      nullStateReads: 'weakest real cell 5,585 of 21,600, bar is 2,000, a missing control reads 0',
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
    // Rule 2: 36,721 of 89,520 changed pixels (41.0%) between form-controls and toggle-rejected
    // Rule 3: weakest real cell 27,717 of 89,520, bar is 10,000, a missing control reads 0
    minChangedPixels: 10_000,
    minInkPixels: 10_000,
    minDistinctColors: 100,
    calibration: {
      changedPixelsMeasured: 36_721,
      totalPixels: 89_520,
      changedRatio: 0.410,
      positiveInkMeasured: 27_717,
      positiveColorsMeasured: 227,
      negativeInkMeasured: 0,
      negativeColorsMeasured: 1,
      nullStateReads: 'weakest real cell 27,717 of 89,520, bar is 10,000, a missing control reads 0',
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
    // Rule 2: 23,663 of 31,500 changed pixels (75.1%) between stepper-upper-bound and toggle-rejected
    // Rule 3: weakest real cell 8,758 of 31,500, bar is 3,000, a missing control reads 0
    minChangedPixels: 5_000,
    minInkPixels: 3_000,
    minDistinctColors: 50,
    calibration: {
      changedPixelsMeasured: 23_663,
      totalPixels: 31_500,
      changedRatio: 0.751,
      positiveInkMeasured: 8_758,
      positiveColorsMeasured: 82,
      negativeInkMeasured: 1_500,
      negativeColorsMeasured: 173,
      nullStateReads: 'weakest real cell 8,758 of 31,500, bar is 3,000, a missing control reads 0',
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
    region: { x: 0, y: 400, width: 393, height: 452 },
    prompt: 'A presented modal bottom sheet surface containing interactive buttons and text is visible.',
    // Rule 2: 1,493,822 of 1,598,724 changed pixels (93.4%) between sheet-open and sheet-dismissed
    // Rule 3: weakest real cell 351,205 of 1,598,724, bar is 100,000, a missing control reads 0
    minChangedPixels: 500_000,
    minInkPixels: 100_000,
    minDistinctColors: 500,
    calibration: {
      changedPixelsMeasured: 1_493_822,
      totalPixels: 1_598_724,
      changedRatio: 0.934,
      positiveInkMeasured: 351_205,
      positiveColorsMeasured: 2_029,
      negativeInkMeasured: 168_825,
      negativeColorsMeasured: 334,
      nullStateReads: 'weakest real cell 351,205 of 1,598,724, bar is 100,000, a missing control reads 0',
    },
  },

  // ==========================================
  // Suite: tabs-menu
  // ==========================================
  {
    name: 'context-menu',
    suite: 'tabs-menu',
    subject: 'Native context menu card',
    positiveCapture: 'tabs-menu/02-checked-toggle-open.png',
    negativeCapture: 'tabs-menu/01-centered-trigger.png',
    region: { x: 33, y: 200, width: 320, height: 350 },
    prompt: 'A native iOS context menu popup card with action rows is open and visible.',
    // Rule 2: 261,636 of 1,008,000 changed pixels (26.0%) between menu open and trigger closed
    // Rule 3: weakest real cell 83,305 of 1,008,000, bar is 50,000, a missing control reads 0
    minChangedPixels: 100_000,
    minInkPixels: 50_000,
    minDistinctColors: 200,
    calibration: {
      changedPixelsMeasured: 261_636,
      totalPixels: 1_008_000,
      changedRatio: 0.260,
      positiveInkMeasured: 83_305,
      positiveColorsMeasured: 589,
      negativeInkMeasured: 205_560,
      negativeColorsMeasured: 311,
      nullStateReads: 'weakest real cell 83,305 of 1,008,000, bar is 50,000, a missing control reads 0',
    },
  },
  {
    name: 'palette-menu',
    suite: 'tabs-menu',
    subject: 'Native context menu palette',
    positiveCapture: 'tabs-menu/04-palette-open.png',
    negativeCapture: 'tabs-menu/01-centered-trigger.png',
    region: { x: 33, y: 200, width: 320, height: 350 },
    prompt: 'A native context menu popup card containing action items including Bold and Italic is open and visible.',
    // Rule 2: 260,692 of 1,008,000 changed pixels (25.9%) between palette open and trigger closed
    // Rule 3: weakest real cell 82,855 of 1,008,000, bar is 50,000, a missing control reads 0
    minChangedPixels: 100_000,
    minInkPixels: 50_000,
    minDistinctColors: 200,
    calibration: {
      changedPixelsMeasured: 260_692,
      totalPixels: 1_008_000,
      changedRatio: 0.259,
      positiveInkMeasured: 82_855,
      positiveColorsMeasured: 592,
      negativeInkMeasured: 205_560,
      negativeColorsMeasured: 311,
      nullStateReads: 'weakest real cell 82,855 of 1_008_000, bar is 50,000, a missing control reads 0',
    },
  },

  // ==========================================
  // Suite: dialogs
  // ==========================================
  {
    name: 'alert-dialog',
    suite: 'dialogs',
    subject: 'SwiftUI Alert modal dialog',
    positiveCapture: 'dialogs/alert-open.png',
    negativeCapture: 'dialogs/confirmation-automatic.png',
    region: { x: 50, y: 320, width: 293, height: 180 },
    prompt: 'A centered alert dialog card with title One Native Alert and action buttons is visible.',
    // Rule 2: 221,282 of 474,660 changed pixels (46.6%) between alert-open and confirmation
    // Rule 3: weakest real cell 224,866 of 474,660, bar is 50,000, a missing control reads 0
    minChangedPixels: 100_000,
    minInkPixels: 50_000,
    minDistinctColors: 100,
    calibration: {
      changedPixelsMeasured: 221_282,
      totalPixels: 474_660,
      changedRatio: 0.466,
      positiveInkMeasured: 224_866,
      positiveColorsMeasured: 392,
      negativeInkMeasured: 251_287,
      negativeColorsMeasured: 597,
      nullStateReads: 'weakest real cell 224,866 of 474,660, bar is 50,000, a missing control reads 0',
    },
  },
  {
    name: 'confirmation-title',
    suite: 'dialogs',
    subject: 'Confirmation dialog visible title header',
    positiveCapture: 'dialogs/confirmation-visible.png',
    negativeCapture: 'dialogs/confirmation-hidden.png',
    region: { x: 50, y: 235, width: 250, height: 80 },
    prompt: 'A dialog card displaying the title One Native Confirmation is visible.',
    // Rule 2: 38,207 of 180,000 changed pixels (21.2%) between visible title and hidden title
    // Rule 3: weakest real cell 73,512 of 180,000, bar is 20,000, a missing control reads 0
    minChangedPixels: 15_000,
    minInkPixels: 20_000,
    minDistinctColors: 100,
    calibration: {
      changedPixelsMeasured: 38_207,
      totalPixels: 180_000,
      changedRatio: 0.212,
      positiveInkMeasured: 73_512,
      positiveColorsMeasured: 1_387,
      negativeInkMeasured: 48_112,
      negativeColorsMeasured: 1_381,
      nullStateReads: 'weakest real cell 73,512 of 180,000, bar is 20,000, a missing control reads 0',
    },
  },

  // ==========================================
  // Suite: host
  // ==========================================
  {
    name: 'host-three-children',
    suite: 'host',
    subject: 'Composed button and stepper in host container',
    positiveCapture: 'host/host-three-children.png',
    negativeCapture: 'host/host-one-child.png',
    region: { x: 16, y: 184, width: 361, height: 157 },
    prompt: 'A composed button labeled Composed button and a composed stepper control labeled Composed stepper are visible inside the container.',
    // Rule 2: 236,195 of 510,093 changed pixels (46.3%) between three-children and one-child host
    // Rule 3: weakest real cell 158,767 of 510,093, bar is 50,000, a missing control reads 0
    minChangedPixels: 50_000,
    minInkPixels: 30_000,
    minDistinctColors: 200,
    calibration: {
      changedPixelsMeasured: 236_195,
      totalPixels: 510_093,
      changedRatio: 0.463,
      positiveInkMeasured: 158_767,
      positiveColorsMeasured: 1_301,
      negativeInkMeasured: 120_230,
      negativeColorsMeasured: 868,
      nullStateReads: 'weakest real cell 158,767 of 510_093, bar is 50,000, a missing control reads 0',
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
    region: { x: 16, y: 590, width: 361, height: 170 },
    prompt: 'A second form section with header MORE containing a Section button and a row with In host is visible.',
    // Rule 2: 317,948 of 552,330 changed pixels (57.6%) between two sections and one section
    // Rule 3: weakest real cell 250,722 of 552,330, bar is 100,000, a missing control reads 0
    minChangedPixels: 50_000,
    minInkPixels: 50_000,
    minDistinctColors: 200,
    calibration: {
      changedPixelsMeasured: 317_948,
      totalPixels: 552_330,
      changedRatio: 0.576,
      positiveInkMeasured: 250_722,
      positiveColorsMeasured: 842,
      negativeInkMeasured: 0,
      negativeColorsMeasured: 1,
      nullStateReads: 'weakest real cell 250,722 of 552,330, bar is 100,000, a missing control reads 0',
    },
  },

  // ==========================================
  // Suite: popover
  // ==========================================
  {
    name: 'popover-balloon',
    suite: 'popover',
    subject: 'Presented popover balloon with Popover body',
    positiveCapture: 'popover/popover-open.png',
    negativeCapture: 'popover/popover-closed.png',
    region: { x: 20, y: 200, width: 300, height: 300 },
    prompt: "A presented popover balloon containing 'Popover body' is visible on the display.",
    // Rule 2: 645,985 of 810,000 changed pixels (79.8%) between popover open and closed
    // Rule 3: weakest real cell 489,334 of 810,000, bar is 100,000, a missing control reads 0
    minChangedPixels: 200_000,
    minInkPixels: 100_000,
    minDistinctColors: 300,
    calibration: {
      changedPixelsMeasured: 645_985,
      totalPixels: 810_000,
      changedRatio: 0.798,
      positiveInkMeasured: 489_334,
      positiveColorsMeasured: 1_755,
      negativeInkMeasured: 411_749,
      negativeColorsMeasured: 650,
      nullStateReads: 'weakest real cell 489,334 of 810,000, bar is 100,000, a missing control reads 0',
    },
  },

  // ==========================================
  // Suite: leaves
  // ==========================================
  {
    name: 'button-prominent-style',
    suite: 'leaves',
    subject: 'Prominent filled button background',
    positiveCapture: 'leaves/button-borderedProminent.png',
    negativeCapture: 'leaves/button-plain.png',
    region: { x: 10, y: 275, width: 373, height: 40 },
    prompt: "A prominent filled button with a solid tinted background capsule around 'Press leaf' is visible.",
    // Rule 2: 21,579 of 134,280 changed pixels (16.1%) between borderedProminent and plain button
    // Rule 3: weakest real cell 19,213 of 134,280, bar is 5,000, a missing control reads 0
    minChangedPixels: 5_000,
    minInkPixels: 5_000,
    minDistinctColors: 100,
    calibration: {
      changedPixelsMeasured: 21_579,
      totalPixels: 134_280,
      changedRatio: 0.161,
      positiveInkMeasured: 19_213,
      positiveColorsMeasured: 449,
      negativeInkMeasured: 5_738,
      negativeColorsMeasured: 453,
      nullStateReads: 'weakest real cell 19,213 of 134,280, bar is 5,000, a missing control reads 0',
    },
  },
  {
    name: 'secure-field-bullets',
    suite: 'leaves',
    subject: 'Masked secret bullets inside text field',
    positiveCapture: 'leaves/secure-masked.png',
    negativeCapture: 'leaves/text-rejected.png',
    region: { x: 10, y: 295, width: 373, height: 25 },
    prompt: 'A text field displaying masked bullet characters (dots) instead of plain letters is visible.',
    // Rule 2: 35,710 of 83,925 changed pixels (42.5%) between secure masked and text rejected
    // Rule 3: weakest real cell 2,958 of 83,925, bar is 1,000, a missing control reads 0
    minChangedPixels: 5_000,
    minInkPixels: 1_000,
    minDistinctColors: 30,
    calibration: {
      changedPixelsMeasured: 35_710,
      totalPixels: 83_925,
      changedRatio: 0.425,
      positiveInkMeasured: 2_958,
      positiveColorsMeasured: 103,
      negativeInkMeasured: 33_185,
      negativeColorsMeasured: 135,
      nullStateReads: 'weakest real cell 2_958 of 83_925, bar is 1,000, a missing control reads 0',
    },
  },

  // ==========================================
  // Suite: map
  // ==========================================
  {
    name: 'map-markers',
    suite: 'map',
    subject: 'Map markers and pin callouts rendered over map view',
    positiveCapture: 'map/map-two-pins.png',
    negativeCapture: 'map/map-no-pins.png',
    region: { x: 10, y: 183, width: 373, height: 285 },
    prompt: 'Map markers or pin callouts (such as red pins or location labels) are visible on the map.',
    // Rule 2: 27,192 of 956,745 changed pixels (2.8%) between two-pins and no-pins
    // Rule 3: weakest real cell 27,192 of 956,745, bar is 15,000, a missing control reads 0
    minChangedPixels: 15_000,
    minInkPixels: 100_000,
    minDistinctColors: 1_000,
    calibration: {
      changedPixelsMeasured: 27_192,
      totalPixels: 956_745,
      changedRatio: 0.028,
      positiveInkMeasured: 749_926,
      positiveColorsMeasured: 14_954,
      negativeInkMeasured: 749_867,
      negativeColorsMeasured: 15_138,
      nullStateReads: 'weakest real cell 27,192 of 956,745, bar is 15,000, a missing control reads 0',
    },
  },
  {
    name: 'map-tiles',
    suite: 'map',
    subject: 'Rendered geographic map tiles showing roads, water, and terrain',
    positiveCapture: 'map/map-no-pins.png',
    negativeCapture: 'media/media-no-player.png',
    region: { x: 10, y: 183, width: 373, height: 220 },
    prompt: 'Rendered geographic map tiles showing roads, water, or geographic map features are visible.',
    // Rule 2: 544,428 of 738,540 changed pixels (73.7%) between map tiles and non-map screen
    // Rule 3: weakest real cell 10,400 colors, bar is 5,000, a flat grey unrendered box reads < 20 colors
    minChangedPixels: 200_000,
    minInkPixels: 200_000,
    minDistinctColors: 5_000,
    calibration: {
      changedPixelsMeasured: 544_428,
      totalPixels: 738_540,
      changedRatio: 0.737,
      positiveInkMeasured: 537_968,
      positiveColorsMeasured: 10_400,
      negativeInkMeasured: 307_759,
      negativeColorsMeasured: 473,
      nullStateReads: 'weakest real cell 10,400 colors, bar is 5,000, a flat grey unrendered box reads < 20 colors',
    },
  },

  // ==========================================
  // Suite: media
  // ==========================================
  {
    name: 'media-player',
    suite: 'media',
    subject: 'Native video player view surface',
    positiveCapture: 'media/media-player.png',
    negativeCapture: 'media/media-no-player.png',
    region: { x: 10, y: 183, width: 373, height: 220 },
    prompt: 'A native video player view surface is present on screen.',
    // Rule 2: 328,551 of 738,540 changed pixels (44.5%) between media player and no player
    // Rule 3: weakest real cell 471,206 of 738,540, bar is 100,000, a missing control reads 0
    minChangedPixels: 100_000,
    minInkPixels: 100_000,
    minDistinctColors: 100,
    calibration: {
      changedPixelsMeasured: 328_551,
      totalPixels: 738_540,
      changedRatio: 0.445,
      positiveInkMeasured: 471_206,
      positiveColorsMeasured: 477,
      negativeInkMeasured: 307_759,
      negativeColorsMeasured: 473,
      nullStateReads: 'weakest real cell 471,206 of 738,540, bar is 100,000, a missing control reads 0',
    },
  },

  // ==========================================
  // Suite: accessibility
  // ==========================================
  {
    name: 'a11y-wrapped-text',
    suite: 'accessibility',
    subject: 'Multi-line wrapped paragraph text',
    positiveCapture: 'accessibility/a11y-wrapped-text.png',
    negativeCapture: 'accessibility/a11y-short-text.png',
    region: { x: 16, y: 180, width: 361, height: 90 },
    prompt: 'A multi-line wrapped paragraph of text spanning several lines is visible.',
    // Rule 2: 55,099 of 292,410 changed pixels (18.8%) between wrapped paragraph and short line
    // Rule 3: weakest real cell 46,085 of 292,410, bar is 20,000, a missing control reads 0
    minChangedPixels: 20_000,
    minInkPixels: 20_000,
    minDistinctColors: 100,
    calibration: {
      changedPixelsMeasured: 55_099,
      totalPixels: 292_410,
      changedRatio: 0.188,
      positiveInkMeasured: 46_085,
      positiveColorsMeasured: 505,
      negativeInkMeasured: 31_258,
      negativeColorsMeasured: 324,
      nullStateReads: 'weakest real cell 46_085 of 292_410, bar is 20,000, a missing control reads 0',
    },
  },
]
