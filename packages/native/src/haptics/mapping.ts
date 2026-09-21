// android sdkInt gating for OneNativeHapticsModule.kt, mirrored as pure
// functions so the boundary behavior is unit-testable off-device. the native
// module is the runtime truth; keep the two in sync.
//
// corrected table (android.view.HapticFeedbackConstants):
// call                      constant      min api  fallback below
// selection()               SEGMENT_TICK  34       CLOCK_TICK (21+)
// impact('light' | 'soft')  KEYBOARD_TAP  8        -
// impact('medium'|'rigid')  VIRTUAL_KEY   5        -
// impact('heavy')           LONG_PRESS    3        -
// notification('success')   CONFIRM       30       VIRTUAL_KEY
// notification('warning')   LONG_PRESS    3        -
// notification('error')     REJECT        30       CONTEXT_CLICK (23+)
//
// below api 30 warning stays LONG_PRESS while error falls to CONTEXT_CLICK
// so the two stay distinct on api 24-29. every constant except SEGMENT_TICK,
// CONFIRM, and REJECT predates the minSdk, so only selection, success, and
// error need gating.

export function selectionConstantForSdk(
  sdkInt: number
): 'SEGMENT_TICK' | 'CLOCK_TICK' {
  return sdkInt >= 34 ? 'SEGMENT_TICK' : 'CLOCK_TICK'
}

export function successConstantForSdk(sdkInt: number): 'CONFIRM' | 'VIRTUAL_KEY' {
  return sdkInt >= 30 ? 'CONFIRM' : 'VIRTUAL_KEY'
}

export function errorConstantForSdk(sdkInt: number): 'REJECT' | 'CONTEXT_CLICK' {
  return sdkInt >= 30 ? 'REJECT' : 'CONTEXT_CLICK'
}
