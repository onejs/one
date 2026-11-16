package dev.onejs.keyboard

import com.facebook.react.uimanager.LayoutShadowNode
import com.facebook.react.uimanager.ReactStylesDiffMap
import com.facebook.react.uimanager.StateWrapper
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.ViewGroupManager
import com.facebook.react.uimanager.ViewManagerDelegate
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.viewmanagers.OneOverKeyboardViewManagerDelegate
import com.facebook.react.viewmanagers.OneOverKeyboardViewManagerInterface
import dev.onejs.keyboard.managers.OverKeyboardViewManagerImpl
import dev.onejs.keyboard.views.overlay.OverKeyboardHostShadowNode
import dev.onejs.keyboard.views.overlay.OverKeyboardHostView

class OverKeyboardViewManager :
  ViewGroupManager<OverKeyboardHostView>(),
  OneOverKeyboardViewManagerInterface<OverKeyboardHostView> {
  private val manager = OverKeyboardViewManagerImpl()
  private val mDelegate = OneOverKeyboardViewManagerDelegate(this)

  override fun getDelegate(): ViewManagerDelegate<OverKeyboardHostView> = mDelegate

  override fun getName(): String = OverKeyboardViewManagerImpl.NAME

  override fun createViewInstance(context: ThemedReactContext): OverKeyboardHostView =
    manager.createViewInstance(context)

  override fun createShadowNodeInstance(): LayoutShadowNode = OverKeyboardHostShadowNode()

  override fun getShadowNodeClass(): Class<out LayoutShadowNode> = OverKeyboardHostShadowNode::class.java

  override fun updateState(
    view: OverKeyboardHostView,
    props: ReactStylesDiffMap,
    stateWrapper: StateWrapper,
  ): Any? {
    view.stateWrapper = stateWrapper
    return null
  }

  @ReactProp(name = "visible")
  override fun setVisible(
    view: OverKeyboardHostView,
    value: Boolean,
  ) {
    manager.setVisible(view, value)
  }
}
