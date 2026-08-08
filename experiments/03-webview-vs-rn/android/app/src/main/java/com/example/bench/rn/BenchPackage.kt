package com.example.bench.rn

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class BenchPackage : ReactPackage {
    override fun createNativeModules(c: ReactApplicationContext): List<NativeModule> =
        listOf(BenchModule(c))

    override fun createViewManagers(c: ReactApplicationContext): List<ViewManager<*, *>> =
        emptyList()
}
