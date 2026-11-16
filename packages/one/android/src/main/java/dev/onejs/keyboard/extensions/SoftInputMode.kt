package dev.onejs.keyboard.extensions

import android.view.WindowManager

/**
 * `softInputMode` packs the adjust behavior together with the state bits and
 * `SOFT_INPUT_IS_FORWARD_NAVIGATION` (set by the system when the activity is launched),
 * so only the adjust bits can be compared.
 */
val Int.isAdjustResize: Boolean
  get() =
    (this and WindowManager.LayoutParams.SOFT_INPUT_MASK_ADJUST) ==
      WindowManager.LayoutParams.SOFT_INPUT_ADJUST_RESIZE
