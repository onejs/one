package dev.onejs.keyboard.interactive.interpolators

interface Interpolator {
  /**
   * A function that allows you to control the layout of the keyboard
   * depending on the position of the finger on the screen.
   *
   * @param dy the distance that the finger has moved relative to the previous location.
   * @param absoluteFingerPosition current position of the finger.
   * @param keyboardPosition current keyboard position.
   * @param offset extra space to the keyboard to activate a gesture
   * @return the distance the keyboard should be moved from its current location.
   */
  fun interpolate(
    dy: Int,
    absoluteFingerPosition: Int,
    keyboardPosition: Int,
    offset: Int,
  ): Int
}
