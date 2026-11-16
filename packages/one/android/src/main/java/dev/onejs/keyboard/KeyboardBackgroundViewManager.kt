package dev.onejs.keyboard

import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.viewmanagers.OneKeyboardBackgroundViewManagerInterface
import com.facebook.react.views.view.ReactViewGroup
import com.facebook.react.views.view.ReactViewManager
import dev.onejs.keyboard.managers.KeyboardBackgroundViewManagerImpl
import dev.onejs.keyboard.views.background.KeyboardBackgroundViewGroup

class KeyboardBackgroundViewManager :
  ReactViewManager(),
  OneKeyboardBackgroundViewManagerInterface<ReactViewGroup> {
  private val manager = KeyboardBackgroundViewManagerImpl()

  override fun getName(): String = KeyboardBackgroundViewManagerImpl.NAME

  override fun createViewInstance(context: ThemedReactContext): KeyboardBackgroundViewGroup =
    manager.createViewInstance(context)
}
