package dev.onejs.keyboard

import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.viewmanagers.OneKeyboardToolbarGroupViewManagerInterface
import com.facebook.react.views.view.ReactViewGroup
import com.facebook.react.views.view.ReactViewManager
import dev.onejs.keyboard.managers.KeyboardToolbarGroupViewManagerImpl
import dev.onejs.keyboard.views.KeyboardToolbarGroupReactViewGroup

class KeyboardToolbarGroupViewManager :
  ReactViewManager(),
  OneKeyboardToolbarGroupViewManagerInterface<ReactViewGroup> {
  private val manager = KeyboardToolbarGroupViewManagerImpl()

  override fun getName(): String = KeyboardToolbarGroupViewManagerImpl.NAME

  override fun createViewInstance(context: ThemedReactContext): KeyboardToolbarGroupReactViewGroup =
    manager.createViewInstance(context)
}
