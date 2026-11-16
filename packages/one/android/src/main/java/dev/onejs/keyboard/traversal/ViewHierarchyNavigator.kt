package dev.onejs.keyboard.traversal

import android.view.View
import android.view.ViewGroup
import android.widget.EditText
import com.facebook.react.bridge.UiThreadUtil
import dev.onejs.keyboard.extensions.focus
import dev.onejs.keyboard.views.KeyboardToolbarGroupReactViewGroup

object ViewHierarchyNavigator {
  fun setFocusTo(
    direction: String,
    view: View,
  ) {
    val input = if (direction == "next") findNextEditText(view) else findPreviousEditText(view)

    UiThreadUtil.runOnUiThread {
      input.focus()
    }
  }

  fun getAllInputFields(viewGroup: View?): List<EditText> {
    val editTexts = mutableListOf<EditText>()

    // Helper function to recursively search for EditText views
    fun findEditTexts(view: View?) {
      if (isValidTextInput(view)) {
        editTexts.add(view as EditText)
      } else if (view is ViewGroup && view !is KeyboardToolbarGroupReactViewGroup) {
        for (i in 0 until view.childCount) {
          findEditTexts(view.getChildAt(i))
        }
      }
    }

    // If the root is a group itself, search within it (for group-scoped queries)
    if (viewGroup is KeyboardToolbarGroupReactViewGroup) {
      for (i in 0 until viewGroup.childCount) {
        findEditTexts(viewGroup.getChildAt(i))
      }
    } else {
      findEditTexts(viewGroup)
    }

    return editTexts
  }

  /**
   * Finds the closest [KeyboardToolbarGroupReactViewGroup] ancestor of the given view.
   * Returns null if the view is not inside any group.
   */
  fun findGroupAncestor(view: View?): KeyboardToolbarGroupReactViewGroup? {
    var current = view?.parent
    while (current != null) {
      if (current is KeyboardToolbarGroupReactViewGroup) {
        return current
      }
      current = current.parent
    }
    return null
  }

  private fun findNextEditText(currentFocus: View): EditText? = findEditTextInDirection(currentFocus, 1)

  private fun findPreviousEditText(currentFocus: View): EditText? = findEditTextInDirection(currentFocus, -1)

  @Suppress("detekt:ReturnCount")
  private fun findEditTextInDirection(
    currentFocus: View,
    direction: Int,
  ): EditText? {
    // Attempt to find the parent view group, return null if not found or not a ViewGroup
    val parentViewGroup = currentFocus.parent as? ViewGroup ?: return null

    // Find the index of the current EditText in its parent
    val currentIndex = parentViewGroup.indexOfChild(currentFocus)

    // Determine the start index and end condition for the loop based on the direction
    var i = if (direction > 0) currentIndex + 1 else currentIndex - 1
    val end = if (direction > 0) parentViewGroup.childCount else -1

    // Iterate over siblings in the specified direction
    while (i != end) {
      val nextChild = parentViewGroup.getChildAt(i)
      findEditTextOrGoDeeper(nextChild, direction)?.let { return it } // Return if an EditText is found
      i += direction
    }

    // Don't navigate outside the group boundary
    if (parentViewGroup is KeyboardToolbarGroupReactViewGroup) {
      return null
    }

    // Recurse to the parent's parent if no sibling EditText is found
    return findEditTextInDirection(parentViewGroup, direction)
  }

  private fun findEditTextInHierarchy(
    viewGroup: ViewGroup,
    direction: Int,
  ): EditText? {
    val range = if (direction > 0) 0 until viewGroup.childCount else viewGroup.childCount - 1 downTo 0

    for (i in range) {
      val child = viewGroup.getChildAt(i)
      findEditTextOrGoDeeper(child, direction)?.let { return it }
    }

    // No EditText found in the current view group
    return null
  }

  private fun findEditTextOrGoDeeper(
    child: View,
    direction: Int,
  ): EditText? {
    var result: EditText? = null

    if (isValidTextInput(child)) {
      result = child as EditText
    } else if (child is ViewGroup && child !is KeyboardToolbarGroupReactViewGroup) {
      // If the child is a ViewGroup, check its children recursively
      result = findEditTextInHierarchy(child, direction)
    }

    return result
  }

  private fun isValidTextInput(view: View?): Boolean = view is EditText && view.isEnabled
}
