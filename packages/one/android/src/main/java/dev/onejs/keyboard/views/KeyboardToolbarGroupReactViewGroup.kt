package dev.onejs.keyboard.views

import android.annotation.SuppressLint
import android.content.Context
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.views.view.ReactViewGroup

@SuppressLint("ViewConstructor")
class KeyboardToolbarGroupReactViewGroup : ReactViewGroup {
  constructor(reactContext: ThemedReactContext) : super(reactContext)
  internal constructor(context: Context) : super(context)
  // semantic view used in KeyboardToolbar traverse algorithm
}
