package dev.onejs.onenative

import android.view.View
import android.view.ViewGroup
import com.facebook.react.bridge.Arguments
import com.facebook.react.uimanager.*
import com.facebook.react.uimanager.annotations.ReactProp
import com.facebook.react.views.view.ReactViewGroup
import com.facebook.react.views.view.ReactViewManager
import java.lang.ref.WeakReference

internal object OnePortalRegistry {
  val hosts = mutableMapOf<String, WeakReference<OnePortalHost>>()
  val portals = mutableListOf<WeakReference<OnePortal>>()
  fun refresh() {
    portals.removeAll { it.get() == null }
    val live = portals.mapNotNull { it.get() }
    val offsets = java.util.IdentityHashMap<OnePortalGroup, Int>()
    for ((index, portal) in live.withIndex()) {
      val replaced = portal.portalName != null && live.drop(index + 1).any {
        it.portalName == portal.portalName
      }
      val host = hosts[portal.hostName]?.get()?.takeIf { it.isAttachedToWindow }
      val target = if (replaced) null else host ?: portal
      val offset = if (target == null) 0 else offsets[target] ?: if (target is OnePortalHost) target.ownChildren.size else 0
      portal.moveTo(target, offset)
      if (target != null) offsets[target] = offset + portal.ownChildren.size
    }
  }
  fun layouts() { portals.forEach { it.get()?.publishLayout() } }
}

// physical child lists belong to Android; managers expose the React-owned list.
// attached moves preserve the window attachment while updating drawing order.
internal open class OnePortalGroup(context: ThemedReactContext) : ReactViewGroup(context) {
  val ownChildren = mutableListOf<View>()
  fun detach(child: View) {
    endViewTransition(child)
    if (child.hasTransientState()) childHasTransientStateChanged(child, false)
    super.detachViewFromParent(child)
    onViewRemoved(child)
    invalidate()
  }
  fun attach(child: View, index: Int) {
    super.attachViewToParent(child, index, child.layoutParams)
    onViewAdded(child)
    if (child.hasTransientState()) childHasTransientStateChanged(child, true)
    invalidate()
  }
}
internal class OnePortalHost(context: ThemedReactContext) : OnePortalGroup(context) {
  var hostName: String? = null
  fun setHost(name: String?) {
    unregister()
    hostName = name
    if (name != null) OnePortalRegistry.hosts[name] = WeakReference(this)
    OnePortalRegistry.refresh()
  }
  fun unregister() {
    if (OnePortalRegistry.hosts[hostName]?.get() === this) OnePortalRegistry.hosts.remove(hostName)
    OnePortalRegistry.refresh()
  }
  override fun onAttachedToWindow() { super.onAttachedToWindow(); post { OnePortalRegistry.refresh() } }
  override fun onDetachedFromWindow() { super.onDetachedFromWindow(); post { OnePortalRegistry.refresh() } }
  override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
    super.onLayout(changed, l, t, r, b)
    OnePortalRegistry.layouts()
  }
}
internal class OnePortal(context: ThemedReactContext) : OnePortalGroup(context) {
  var hostName: String? = null
  var portalName: String? = null
  var state: StateWrapper? = null
  private var target: OnePortalGroup? = this
  private var lastLayout: List<Any>? = null
  init { register() }
  fun register() {
    if (OnePortalRegistry.portals.none { it.get() === this }) OnePortalRegistry.portals.add(WeakReference(this))
  }
  fun moveTo(next: OnePortalGroup?, offset: Int) {
    target = next
    pointerEvents = if (next is OnePortalHost) PointerEvents.NONE else PointerEvents.BOX_NONE
    for ((index, child) in ownChildren.withIndex()) {
      val destinationIndex = offset + index
      val parent = child.parent as? ViewGroup
      if (parent === next && (next == null || next.indexOfChild(child) == destinationIndex)) continue
      val attachedMove = parent is OnePortalGroup && next != null &&
        child.isAttachedToWindow && next.isAttachedToWindow && parent.rootView === next.rootView
      if (attachedMove) (parent as OnePortalGroup).detach(child) else parent?.removeView(child)
      if (next != null) {
        if (attachedMove) next.attach(child, minOf(destinationIndex, next.childCount)) else next.addView(child, minOf(destinationIndex, next.childCount))
      }
    }
    publishLayout()
  }
  fun publishLayout() {
    val wrapper = state ?: return
    val host = target as? OnePortalHost
    val active = host != null && isAttachedToWindow && host.isAttachedToWindow
    val sourcePoint = IntArray(2)
    val hostPoint = IntArray(2)
    if (active) { getLocationOnScreen(sourcePoint); host!!.getLocationOnScreen(hostPoint) }
    val density = resources.displayMetrics.density
    val width = if (active) host!!.width / density.toDouble() else 0.0
    val height = if (active) host!!.height / density.toDouble() else 0.0
    val x = if (active) (hostPoint[0] - sourcePoint[0]) / density.toDouble() else 0.0
    val y = if (active) (hostPoint[1] - sourcePoint[1]) / density.toDouble() else 0.0
    val layout = listOf(active, width, height, x, y)
    if (lastLayout == layout) return
    lastLayout = layout
    wrapper.updateState(Arguments.createMap().apply {
      putBoolean("active", active); putDouble("hostWidth", width); putDouble("hostHeight", height)
      putDouble("offsetX", x); putDouble("offsetY", y)
    })
  }
  fun cleanup() {
    OnePortalRegistry.portals.removeAll { it.get() == null || it.get() === this }
    for (child in ownChildren) (child.parent as? ViewGroup)?.removeView(child)
    ownChildren.clear(); state = null; lastLayout = null; target = this; hostName = null; portalName = null
    OnePortalRegistry.refresh()
  }
  override fun onAttachedToWindow() { super.onAttachedToWindow(); publishLayout() }
  override fun onLayout(changed: Boolean, l: Int, t: Int, r: Int, b: Int) {
    super.onLayout(changed, l, t, r, b); publishLayout()
  }
}

class OneNativePortalViewManager : ReactViewManager() {
  override fun getName() = "OneNativePortalView"
  override fun createViewInstance(context: ThemedReactContext): ReactViewGroup = OnePortal(context)
  @ReactProp(name = "hostName") fun setHostName(view: ReactViewGroup, name: String?) {
    (view as OnePortal).register(); view.hostName = name?.takeIf { it.isNotEmpty() }; OnePortalRegistry.refresh()
  }
  @ReactProp(name = "name") fun setName(view: ReactViewGroup, name: String?) {
    (view as OnePortal).register(); view.portalName = name?.takeIf { it.isNotEmpty() }; OnePortalRegistry.refresh()
  }
  override fun updateState(view: ReactViewGroup, props: ReactStylesDiffMap?, state: StateWrapper?): Any? {
    (view as OnePortal).state = state; view.publishLayout(); return null
  }
  override fun addView(parent: ReactViewGroup, child: View, index: Int) {
    (parent as OnePortal).ownChildren.add(index, child); OnePortalRegistry.refresh()
  }
  override fun getChildCount(parent: ReactViewGroup) = (parent as OnePortal).ownChildren.size
  override fun getChildAt(parent: ReactViewGroup, index: Int) = (parent as OnePortal).ownChildren[index]
  override fun removeViewAt(parent: ReactViewGroup, index: Int) {
    val child = (parent as OnePortal).ownChildren.removeAt(index)
    (child.parent as? ViewGroup)?.removeView(child)
  }
  override fun removeAllViews(parent: ReactViewGroup) {
    for (index in getChildCount(parent) - 1 downTo 0) removeViewAt(parent, index)
  }
  override fun onDropViewInstance(view: ReactViewGroup) { (view as OnePortal).cleanup(); super.onDropViewInstance(view) }
}
class OneNativePortalHostViewManager : ReactViewManager() {
  override fun getName() = "OneNativePortalHostView"
  override fun createViewInstance(context: ThemedReactContext): ReactViewGroup = OnePortalHost(context).also {
    it.pointerEvents = PointerEvents.BOX_NONE
  }
  @ReactProp(name = "name") fun setName(view: ReactViewGroup, name: String?) { (view as OnePortalHost).setHost(name) }
  override fun addView(parent: ReactViewGroup, child: View, index: Int) {
    (parent as OnePortalHost).ownChildren.add(index, child)
    parent.addView(child, index)
    OnePortalRegistry.refresh()
  }
  override fun getChildCount(parent: ReactViewGroup) = (parent as OnePortalHost).ownChildren.size
  override fun getChildAt(parent: ReactViewGroup, index: Int) = (parent as OnePortalHost).ownChildren[index]
  override fun removeViewAt(parent: ReactViewGroup, index: Int) {
    val child = (parent as OnePortalHost).ownChildren.removeAt(index); parent.removeView(child)
  }
  override fun removeAllViews(parent: ReactViewGroup) {
    for (index in getChildCount(parent) - 1 downTo 0) removeViewAt(parent, index)
  }
  override fun onDropViewInstance(view: ReactViewGroup) { (view as OnePortalHost).unregister(); super.onDropViewInstance(view) }
}
