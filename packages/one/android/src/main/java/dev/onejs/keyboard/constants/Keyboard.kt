package dev.onejs.keyboard.constants

import android.os.Build

object Keyboard {
  val IS_ANIMATION_EMULATED = Build.VERSION.SDK_INT < Build.VERSION_CODES.R
}
