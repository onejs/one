package dev.onejs.keyboard.interactive.interpolators

class IosInterpolator : Interpolator {
  override fun interpolate(
    dy: Int,
    absoluteFingerPosition: Int,
    keyboardPosition: Int,
    offset: Int,
  ): Int {
    if (
      // user over scrolled keyboard
      absoluteFingerPosition <= keyboardPosition + offset ||
      // user scrolls up
      dy <= 0
    ) {
      return dy
    }

    return 0
  }
}
