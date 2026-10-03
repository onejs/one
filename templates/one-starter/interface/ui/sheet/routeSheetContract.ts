// the vocabulary a sheet route is declared in, and the two stack-option shapes
// its legs build. the settings live here for the reason forms/formContract.ts
// gives: every leg takes the same call, so a knob one leg cannot express must
// still be spelled the same way, or an app stops compiling on the platform it
// was not written on.

/** where the sheet opens: half the screen, expanding on scroll, or full. */
export type RouteSheetDetent = 'half' | 'full'

export type RouteSheetSettings = {
  /** where the sheet opens: half the screen, expanding on scroll, or full */
  initialDetent?: RouteSheetDetent
  /** at half, leave the screen behind touchable (a maps-style sheet) */
  undimmed?: boolean
}

// ios and web present this declaration: ios hands it to the native stack, web
// to One's route-sheet presentation, which reads the same option names.
export type RouteSheetOptions = {
  presentation: 'formSheet'
  sheetAllowedDetents: number[]
  sheetCornerRadius: number
  sheetGrabberVisible: boolean
  sheetInitialDetentIndex: number
  sheetLargestUndimmedDetentIndex: number | 'none'
  // the screen is transparent so the frame's material sits over the
  // presenting screen (see forms/FormSheetBody)
  contentStyle: { backgroundColor: 'transparent' }
}

// android has no system form sheet, so the route presents over the presenting
// screen as a transparent modal and the frame draws the sheet itself (see
// forms/FormSheetBodyImpl.android.tsx).
export type RouteSheetAndroidOptions = {
  presentation: 'transparentModal'
  contentStyle: { backgroundColor: 'transparent' }
  // no system transition: the sheet owns the motion
  animation: 'none'
}
