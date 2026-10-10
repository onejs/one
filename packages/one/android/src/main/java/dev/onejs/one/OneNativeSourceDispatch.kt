package dev.onejs.one

interface OneNativeSourceDispatch {
    val contractHash: String
    suspend fun call(module: String, method: String, argsJson: String): String
}
