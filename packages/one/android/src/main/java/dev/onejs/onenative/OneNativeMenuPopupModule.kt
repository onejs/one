package dev.onejs.onenative

import android.view.Menu
import android.view.View
import android.widget.PopupMenu
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableArray
import com.facebook.react.bridge.UiThreadUtil

// a platform popup anchored to the actual react native trigger view.
class OneNativeMenuPopupModule(reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = NAME

    @ReactMethod
    fun show(anchorTag: Int, items: ReadableArray, promise: Promise) {
        UiThreadUtil.runOnUiThread {
            val activity = reactApplicationContext.currentActivity
            val anchor = activity?.window?.decorView?.findViewById<View>(anchorTag)
            if (activity == null || anchor == null) {
                promise.reject("E_MENU_ANCHOR", "Menu trigger has no foreground native view")
                return@runOnUiThread
            }

            try {
                val popup = PopupMenu(activity, anchor)
                val containers = mutableMapOf("" to popup.menu)
                val selections = mutableMapOf<Int, Selection>()
                var nextId = 1
                for (index in 0 until items.size()) {
                    val item = items.getMap(index) ?: continue
                    if (item.getBoolean("hidden")) continue
                    val id = item.getString("id") ?: continue
                    val title = item.getString("title") ?: ""
                    val parent = containers[item.getString("parentId") ?: ""] ?: popup.menu
                    val disabled = item.getBoolean("disabled")
                    when (item.getString("type")) {
                        "submenu", "section" -> {
                            val submenu = parent.addSubMenu(Menu.NONE, nextId++, Menu.NONE, title)
                            submenu.item.isEnabled = !disabled
                            containers[id] = submenu
                        }
                        "controlGroup" -> containers[id] = parent
                        "divider" -> Unit
                        "action" -> {
                            val entryId = nextId++
                            parent.add(Menu.NONE, entryId, Menu.NONE, title).isEnabled = !disabled
                            selections[entryId] = Selection("action", id, false, 0)
                        }
                        "toggle" -> {
                            val values = item.getArray("values") ?: continue
                            for (sourceIndex in 0 until values.size()) {
                                val entryId = nextId++
                                val label = if (values.size() == 1) title else "$title ${sourceIndex + 1}"
                                val entry = parent.add(Menu.NONE, entryId, Menu.NONE, label)
                                entry.isEnabled = !disabled
                                entry.isCheckable = true
                                entry.isChecked = values.getBoolean(sourceIndex)
                                selections[entryId] =
                                    Selection("toggle", id, !entry.isChecked, sourceIndex)
                            }
                        }
                    }
                }
                var settled = false
                popup.setOnMenuItemClickListener { clicked ->
                    val selection = selections[clicked.itemId]
                    if (selection != null && !settled) {
                        settled = true
                        promise.resolve(Arguments.createMap().apply {
                            putString("type", selection.type)
                            putString("id", selection.id)
                            putBoolean("value", selection.value)
                            putInt("sourceIndex", selection.sourceIndex)
                        })
                    }
                    selection != null
                }
                popup.setOnDismissListener {
                    if (!settled) {
                        settled = true
                        promise.resolve(null)
                    }
                }
                popup.show()
            } catch (error: Exception) {
                promise.reject("E_MENU_SHOW", "Menu could not open: ${error.message}", error)
            }
        }
    }

    private data class Selection(
        val type: String,
        val id: String,
        val value: Boolean,
        val sourceIndex: Int,
    )

    companion object {
        const val NAME = "OneNativeMenuPopup"
    }
}
