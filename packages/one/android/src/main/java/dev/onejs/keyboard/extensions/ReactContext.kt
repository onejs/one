package dev.onejs.keyboard.extensions

import android.view.View
import android.view.ViewGroup
import android.view.WindowManager
import com.facebook.react.bridge.ReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.uimanager.common.UIManagerType
import com.facebook.react.uimanager.events.EventDispatcher

val ReactContext.uiManager
  get() = UIManagerHelper.getUIManager(this, UIManagerType.FABRIC)

val ReactContext.eventDispatcher: EventDispatcher?
  get() = UIManagerHelper.getEventDispatcher(this, UIManagerType.FABRIC)

val ReactContext.rootView: View?
  get() =
    this.currentActivity
      ?.window
      ?.decorView
      ?.rootView

val ReactContext.content: ViewGroup?
  get() =
    this.currentActivity?.window?.decorView?.rootView?.findViewById(
      androidx.appcompat.R.id.action_bar_root,
    )

val ReactContext.windowSoftInputMode: Int
  get() =
    this
      .currentActivity
      ?.window
      ?.attributes
      ?.softInputMode
      ?: WindowManager.LayoutParams.SOFT_INPUT_STATE_UNSPECIFIED
