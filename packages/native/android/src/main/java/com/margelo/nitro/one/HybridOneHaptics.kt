package com.margelo.nitro.one

import android.os.Build
import android.view.HapticFeedbackConstants
import com.margelo.nitro.NitroModules

// Fire-and-forget tactile feedback, the Android half of One.UI.Haptics. Every
// call hops to the UI thread and goes through the activity decor view's
// performHapticFeedback: off-thread the call is a silent no-op, so the hop is
// mandatory, and headless/background (no activity) is a silent no-op, never a
// crash. FLAG_IGNORE_VIEW_SETTING bypasses accidental view-level suppression
// while still honoring the user's OS-wide haptics setting. No Vibrator, no
// VIBRATE permission.
//
// Mapping (android.view.HapticFeedbackConstants):
// selection()               SEGMENT_TICK (34+) else CLOCK_TICK (21+)
// impact('light' | 'soft')  KEYBOARD_TAP (8+)
// impact('medium'|'rigid')  VIRTUAL_KEY (5+)
// impact('heavy')           LONG_PRESS (3+)
// notification('success')   CONFIRM (30+) else VIRTUAL_KEY
// notification('warning')   LONG_PRESS
// notification('error')     REJECT (30+) else CONTEXT_CLICK (23+)
// Android has no soft/rigid grades, so they fold onto the nearest grade.
// Below API 30 warning stays LONG_PRESS while error falls to CONTEXT_CLICK
// so the two stay distinct on API 24-29.
class HybridOneHaptics : HybridOneHapticsSpec() {
    private fun perform(feedbackConstant: Int) {
        val activity = NitroModules.applicationContext?.currentActivity ?: return
        activity.runOnUiThread {
            activity.window?.decorView?.performHapticFeedback(
                feedbackConstant,
                HapticFeedbackConstants.FLAG_IGNORE_VIEW_SETTING
            )
        }
    }

    override fun selection() {
        perform(
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.UPSIDE_DOWN_CAKE) {
                HapticFeedbackConstants.SEGMENT_TICK
            } else {
                HapticFeedbackConstants.CLOCK_TICK
            }
        )
    }

    override fun impact(style: HapticImpact) {
        perform(
            when (style) {
                HapticImpact.LIGHT, HapticImpact.SOFT -> HapticFeedbackConstants.KEYBOARD_TAP
                HapticImpact.MEDIUM, HapticImpact.RIGID -> HapticFeedbackConstants.VIRTUAL_KEY
                HapticImpact.HEAVY -> HapticFeedbackConstants.LONG_PRESS
            }
        )
    }

    override fun notification(type: HapticNotification) {
        perform(
            when (type) {
                HapticNotification.SUCCESS ->
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        HapticFeedbackConstants.CONFIRM
                    } else {
                        HapticFeedbackConstants.VIRTUAL_KEY
                    }
                HapticNotification.WARNING -> HapticFeedbackConstants.LONG_PRESS
                HapticNotification.ERROR ->
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
                        HapticFeedbackConstants.REJECT
                    } else {
                        HapticFeedbackConstants.CONTEXT_CLICK
                    }
            }
        )
    }
}
