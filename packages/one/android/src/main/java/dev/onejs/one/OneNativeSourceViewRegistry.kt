package dev.onejs.one

import java.util.concurrent.ConcurrentHashMap

internal object OneNativeSourceViewRegistry {
    private val instances = ConcurrentHashMap<String, OneNativeSourceViewDispatch>()

    fun get(sourceId: String): OneNativeSourceViewDispatch {
        return instances.computeIfAbsent(sourceId) { id ->
            val name = "OneNativeSourceViews_$id"
            try {
                val type = Class.forName(name)
                type.getDeclaredConstructor().newInstance() as OneNativeSourceViewDispatch
            } catch (e: ClassNotFoundException) {
                error("native view dispatch $name is not linked; rebuild the app")
            } catch (e: Exception) {
                error("failed to instantiate $name: ${e.message}")
            }
        }
    }
}
