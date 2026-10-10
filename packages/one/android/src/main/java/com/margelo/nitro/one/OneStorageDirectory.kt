package com.margelo.nitro.one

import com.facebook.proguard.annotations.DoNotStrip
import com.margelo.nitro.NitroModules
import java.io.File

// hands One.Storage's c++ engine the app's private directory, which only the
// android context knows. null until react has set the context.
@DoNotStrip
object OneStorageDirectory {
    @JvmStatic
    @DoNotStrip
    fun path(): String? {
        val context = NitroModules.applicationContext ?: return null
        val directory = File(context.filesDir, "one")
        directory.mkdirs()
        return directory.absolutePath
    }
}
