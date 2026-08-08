package com.example.bench

import android.app.Application
import com.example.bench.rn.BenchPackage
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader

class BenchApplication : Application(), ReactApplication {

    override val reactNativeHost: ReactNativeHost =
        object : DefaultReactNativeHost(this) {
            override fun getPackages(): List<ReactPackage> =
                PackageList(this@BenchApplication).packages.apply { add(BenchPackage()) }

            override fun getJSMainModuleName(): String = "index"
            override fun getUseDeveloperSupport(): Boolean = false
            override val isNewArchEnabled: Boolean = false
            override val isHermesEnabled: Boolean = true
        }

    override fun onCreate() {
        super.onCreate()
        // SoLoader 는 RN 을 쓰든 안 쓰든 앱 시작에 한 번 돕니다.
        // 웹뷰만 쓰는 화면에도 이 비용이 이미 들어가 있다는 뜻입니다.
        SoLoader.init(this, OpenSourceMergedSoMapping)
    }
}
