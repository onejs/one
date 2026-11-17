package dev.onejs.bun

import com.facebook.jni.HybridData
import com.facebook.proguard.annotations.DoNotStrip
import com.facebook.react.runtime.JSRuntimeFactory
import com.facebook.soloader.SoLoader

@DoNotStrip
class BunInstance : JSRuntimeFactory(initHybrid()) {
  companion object {
    @JvmStatic
    @DoNotStrip
    private external fun initHybrid(): HybridData

    init {
      SoLoader.loadLibrary("onebunengine")
    }
  }
}
