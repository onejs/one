package dev.onejs.keyboard.extensions

import androidx.core.view.WindowInsetsAnimationCompat
import androidx.core.view.WindowInsetsCompat

val WindowInsetsAnimationCompat.isKeyboardAnimation: Boolean
  get() = typeMask and WindowInsetsCompat.Type.ime() != 0
