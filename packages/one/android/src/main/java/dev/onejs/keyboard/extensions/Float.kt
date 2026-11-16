package dev.onejs.keyboard.extensions

import android.content.res.Resources

val Float.dp: Double
  get() = (this / Resources.getSystem().displayMetrics.density).toDouble()
val Float.px: Double
  get() = (this * Resources.getSystem().displayMetrics.density).toDouble()
