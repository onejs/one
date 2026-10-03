package com.margelo.nitro.one

import com.margelo.nitro.core.Promise
import dev.onejs.one.OneNativeSourceDispatch
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch

class HybridOneNativeModules : HybridOneNativeModulesSpec() {
    private val main = CoroutineScope(SupervisorJob() + Dispatchers.Main.immediate)
    private val instances = mutableMapOf<String, OneNativeSourceDispatch>()

    override fun call(module: String, methodName: String, argsJson: String, contractHash: String): Promise<String> {
        val promise = Promise<String>()
        main.launch {
            try {
                val packageName = module.substringBefore('.', "")
                if (packageName.isEmpty() || !module.contains('.')) {
                    throw OneNativeError("E_NATIVE_SOURCE", "invalid module $module")
                }
                val dispatcher = instances.getOrPut(packageName) {
                    val name = "OneNativeSource_$packageName"
                    val type = Class.forName(name)
                    type.getDeclaredConstructor().newInstance() as OneNativeSourceDispatch
                }
                if (dispatcher.contractHash != contractHash) {
                    throw OneNativeError("E_NATIVE_SOURCE_REBUILD", "native module $module changed; rebuild the app")
                }
                promise.resolve(dispatcher.call(module, methodName, argsJson))
            } catch (error: Exception) {
                promise.reject(
                    if (error is OneNativeError) error
                    else OneNativeError("E_NATIVE_SOURCE", "$module.$methodName: ${error.message}")
                )
            }
        }
        return promise
    }
}
