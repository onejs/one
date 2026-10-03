// the one form sheet a route presents over its screen, in the native stack's
// own vocabulary. every layout used to copy this block and vary two values; the
// two values are the knobs. a sheet with a different shape (more detents, a
// leading placement) writes its own block instead of adding a knob here.
//
// the declaration is one per platform: ios hands the native stack a formSheet,
// web hands One's route-sheet presentation the same block, and android presents
// a transparent modal its own sheet fills. the split lives one relative hop
// behind this entry for the reason forms/FormSheetBody.tsx gives: the exports
// map names this file, and a file the exports map names never gains
// `.ios`/`.android` siblings, because the exports target resolves exactly and
// every device would read one leg.
export * from './routeSheetOptionsImpl'
