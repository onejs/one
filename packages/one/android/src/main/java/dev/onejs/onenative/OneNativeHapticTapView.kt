package dev.onejs.onenative

import android.content.Context
import android.os.Build
import android.view.HapticFeedbackConstants
import android.view.MotionEvent
import android.view.ViewConfiguration
import com.facebook.react.views.view.ReactViewGroup
import kotlin.math.abs

// plays a haptic when a tap inside the view ends, on the UI thread, the
// android side of HapticTap. a parent scroll that takes the
// gesture sends a cancel, and movement past touch slop or a hold as long as
// a long press plays nothing, as Pressable's onPress. the constants match
// One.Haptics.
class OneNativeHapticTapView(context: Context) : ReactViewGroup(context) {
  var feedback: String = "selection"

  private val slop = ViewConfiguration.get(context).scaledTouchSlop
  private var downX = 0f
  private var downY = 0f
  private var downTime = 0L
  private var tracking = false

  override fun onInterceptTouchEvent(event: MotionEvent): Boolean {
    track(event)
    return super.onInterceptTouchEvent(event)
  }

  // claiming the gesture keeps its moves and release coming here when no child
  // takes it. react native dispatches JS touches from the root's intercept,
  // which every event still passes through.
  override fun onTouchEvent(event: MotionEvent): Boolean {
    track(event)
    super.onTouchEvent(event)
    return true
  }

  private fun track(event: MotionEvent) {
    when (event.actionMasked) {
      MotionEvent.ACTION_DOWN -> {
        downX = event.x
        downY = event.y
        downTime = event.eventTime
        tracking = true
      }
      MotionEvent.ACTION_MOVE ->
          if (abs(event.x - downX) > slop || abs(event.y - downY) > slop) tracking = false
      MotionEvent.ACTION_POINTER_DOWN, MotionEvent.ACTION_CANCEL -> tracking = false
      MotionEvent.ACTION_UP -> {
        if (tracking && event.eventTime - downTime < ViewConfiguration.getLongPressTimeout()) {
          performHapticFeedback(constant())
        }
        tracking = false
      }
    }
  }

  private fun constant(): Int =
      when (feedback) {
        "light", "soft" -> HapticFeedbackConstants.KEYBOARD_TAP
        "medium", "rigid" -> HapticFeedbackConstants.VIRTUAL_KEY
        "heavy" -> HapticFeedbackConstants.LONG_PRESS
        else ->
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
              HapticFeedbackConstants.SEGMENT_TICK
            } else {
              HapticFeedbackConstants.CLOCK_TICK
            }
      }
}
