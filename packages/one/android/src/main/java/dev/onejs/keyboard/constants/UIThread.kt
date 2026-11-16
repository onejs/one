package dev.onejs.keyboard.constants

import kotlin.math.floor

object UIThread {
  const val MILLISECONDS_IN_SECOND = 1000.0
  const val FPS = 60
  val NEXT_FRAME = floor(MILLISECONDS_IN_SECOND / FPS).toLong()
}
