package dev.onejs.keyboard.log

import android.util.Log
import com.facebook.react.common.build.ReactBuildConfig

object Logger {
  private val enabled = ReactBuildConfig.DEBUG

  fun i(
    tag: String?,
    message: String,
    throwable: Throwable? = null,
  ) {
    if (enabled) {
      Log.i(tag, message, throwable)
    }
  }

  fun w(
    tag: String?,
    message: String,
    throwable: Throwable? = null,
  ) {
    if (enabled) {
      Log.w(tag, message, throwable)
    }
  }
}
