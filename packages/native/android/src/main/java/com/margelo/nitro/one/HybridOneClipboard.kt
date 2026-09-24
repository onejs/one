package com.margelo.nitro.one

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import com.margelo.nitro.NitroModules
import com.margelo.nitro.core.Promise

// string-only clipboard, matching expo-clipboard's string api: get/set/has
// backed by the system clipboard manager.
class HybridOneClipboard : HybridOneClipboardSpec() {
    private fun context(): Context =
        NitroModules.applicationContext
            ?: throw IllegalStateException("Clipboard: React context is not ready")

    private fun clipboard(): ClipboardManager =
        context().getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager

    private fun primaryText(): String {
        val clip = clipboard().primaryClip
        if (clip == null || clip.itemCount == 0) return ""
        return clip.getItemAt(0)?.coerceToText(context())?.toString() ?: ""
    }

    override fun getString(): Promise<String> = Promise.async { primaryText() }

    override fun setString(text: String): Promise<Boolean> = Promise.async {
        clipboard().setPrimaryClip(ClipData.newPlainText("text", text))
        true
    }

    override fun hasString(): Promise<Boolean> = Promise.async { primaryText().isNotEmpty() }
}
