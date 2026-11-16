package dev.onejs.keyboard.listeners

import android.text.TextWatcher
import android.view.View
import android.view.View.OnLayoutChangeListener
import android.view.ViewTreeObserver.OnGlobalFocusChangeListener
import android.widget.EditText
import com.facebook.react.bridge.Arguments
import com.facebook.react.uimanager.ThemedReactContext
import com.facebook.react.uimanager.UIManagerHelper
import com.facebook.react.views.view.ReactViewGroup
import dev.onejs.keyboard.events.FocusedInputLayoutChangedEvent
import dev.onejs.keyboard.events.FocusedInputLayoutChangedEventData
import dev.onejs.keyboard.events.FocusedInputSelectionChangedEvent
import dev.onejs.keyboard.events.FocusedInputSelectionChangedEventData
import dev.onejs.keyboard.events.FocusedInputTextChangedEvent
import dev.onejs.keyboard.extensions.addOnSelectionChangedListener
import dev.onejs.keyboard.extensions.addOnTextChangedListener
import dev.onejs.keyboard.extensions.dispatchEvent
import dev.onejs.keyboard.extensions.dp
import dev.onejs.keyboard.extensions.emitEvent
import dev.onejs.keyboard.extensions.locationInScrollView
import dev.onejs.keyboard.extensions.parentScrollView
import dev.onejs.keyboard.extensions.reactViewTag
import dev.onejs.keyboard.extensions.rootView
import dev.onejs.keyboard.extensions.screenLocation
import dev.onejs.keyboard.traversal.FocusedInputHolder
import dev.onejs.keyboard.traversal.ViewHierarchyNavigator

val noFocusedInputEvent =
  FocusedInputLayoutChangedEventData(
    x = 0.0,
    y = 0.0,
    width = 0.0,
    height = 0.0,
    absoluteX = 0.0,
    absoluteY = 0.0,
    contentX = 0.0,
    contentY = 0.0,
    target = -1,
    parentScrollViewTarget = -1,
  )

class FocusedInputObserver(
  val view: View,
  private val eventPropagationView: ReactViewGroup,
  private val context: ThemedReactContext?,
) {
  // constructor variables
  private val surfaceId = UIManagerHelper.getSurfaceId(eventPropagationView)

  // state variables
  private var lastFocusedInput: EditText? = null
  private var lastLayoutEventDispatched: FocusedInputLayoutChangedEventData = noFocusedInputEvent
  private var textWatcher: TextWatcher? = null
  private var selectionSubscription: (() -> Unit)? = null

  // listeners
  private val layoutListener =
    OnLayoutChangeListener { v, left, top, right, bottom, oldLeft, oldTop, oldRight, oldBottom ->
      this.syncUpLayout()
    }
  private val textListener: (String) -> Unit = { text ->
    syncUpLayout()
    context.dispatchEvent(
      eventPropagationView.id,
      FocusedInputTextChangedEvent(
        surfaceId,
        eventPropagationView.id,
        text = text,
      ),
    )
  }
  private val selectionListener: (
    start: Int,
    end: Int,
    startX: Double,
    startY: Double,
    endX: Double,
    endY: Double,
  ) -> Unit = listener@{ start, end, startX, startY, endX, endY ->
    val input = lastFocusedInput ?: return@listener

    syncUpLayout()
    context.dispatchEvent(
      eventPropagationView.id,
      FocusedInputSelectionChangedEvent(
        surfaceId,
        eventPropagationView.id,
        event =
          FocusedInputSelectionChangedEventData(
            target = input.id,
            start = start,
            end = end,
            startX = startX,
            startY = startY,
            endX = endX,
            endY = endY,
          ),
      ),
    )
  }
  private val focusListener =
    OnGlobalFocusChangeListener { oldFocus, newFocus ->
      // unfocused or focus was changed
      if (newFocus == null || oldFocus != null) {
        stopObservingFocusedInput()
      }
      if (newFocus is EditText) {
        lastFocusedInput = newFocus
        newFocus.addOnLayoutChangeListener(layoutListener)
        this.syncUpLayout()
        textWatcher = newFocus.addOnTextChangedListener(textListener)
        selectionSubscription = newFocus.addOnSelectionChangedListener(selectionListener)
        FocusedInputHolder.set(newFocus)

        val groupAncestor = ViewHierarchyNavigator.findGroupAncestor(newFocus)
        val allInputFields = ViewHierarchyNavigator.getAllInputFields(groupAncestor ?: context?.rootView)
        val currentIndex = allInputFields.indexOf(newFocus)

        context.emitEvent(
          "focusDidSet",
          Arguments.createMap().apply {
            putInt("current", currentIndex)
            putInt("count", allInputFields.size)
          },
        )
      }
      // unfocused
      if (newFocus == null) {
        dispatchLayoutEventToJS(noFocusedInputEvent)
      }
    }

  init {
    view.viewTreeObserver.addOnGlobalFocusChangeListener(focusListener)
  }

  fun syncUpLayout() {
    val input = lastFocusedInput ?: return

    val (x, y) = input.screenLocation
    val parentScrollView = input.parentScrollView
    val (contentX, contentY) = input.locationInScrollView(parentScrollView)
    val event =
      FocusedInputLayoutChangedEventData(
        x = input.x.dp,
        y = input.y.dp,
        width = input.width.toFloat().dp,
        height = input.height.toFloat().dp,
        absoluteX = x.toFloat().dp,
        absoluteY = y.toFloat().dp,
        contentX = contentX.toFloat().dp,
        contentY = contentY.toFloat().dp,
        target = input.id,
        parentScrollViewTarget = parentScrollView.reactViewTag,
      )

    dispatchLayoutEventToJS(event)
  }

  fun destroy() {
    view.viewTreeObserver.removeOnGlobalFocusChangeListener(focusListener)
    stopObservingFocusedInput()
  }

  private fun stopObservingFocusedInput() {
    val input = lastFocusedInput
    val watcher = textWatcher
    val unsubscribeFromSelectionChanges = selectionSubscription

    lastFocusedInput = null
    textWatcher = null
    selectionSubscription = null

    input?.removeOnLayoutChangeListener(layoutListener)
    if (input != null && watcher != null) {
      // remove it asynchronously to avoid crash in stripe input
      // see https://github.com/stripe/stripe-android/issues/10178
      input.post {
        input.removeTextChangedListener(watcher)
      }
    }
    unsubscribeFromSelectionChanges?.invoke()
  }

  private fun dispatchLayoutEventToJS(event: FocusedInputLayoutChangedEventData) {
    if (event != lastLayoutEventDispatched) {
      lastLayoutEventDispatched = event
      context.dispatchEvent(
        eventPropagationView.id,
        FocusedInputLayoutChangedEvent(
          surfaceId,
          eventPropagationView.id,
          event = event,
        ),
      )
    }
  }
}
