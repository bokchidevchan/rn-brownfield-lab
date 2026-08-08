package com.example.mf

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader

/**
 * 01 번의 HostApplication 과 거의 같습니다.
 *
 * 다른 점은 번들의 출처뿐입니다. Metro 대신 Rspack 이 만든 번들을 씁니다.
 * 네이티브 쪽에서 보면 그냥 assets 에 든 JS 파일 하나라 차이가 없습니다.
 *
 * Re.Pack 의 ScriptManager 는 autolinking 으로 들어옵니다.
 * PackageList 에 자동으로 포함되므로 여기 손으로 추가할 게 없습니다.
 */
class MfApplication : Application(), ReactApplication {

    override val reactNativeHost: ReactNativeHost =
        object : DefaultReactNativeHost(this) {
            override fun getPackages(): List<ReactPackage> =
                PackageList(this@MfApplication).packages

            override fun getJSMainModuleName(): String = "index"

            // Rspack 이 만들어 assets 에 넣어 둔 파일입니다.
            override fun getBundleAssetName(): String = "index.android.bundle"

            override fun getUseDeveloperSupport(): Boolean = false
            override val isNewArchEnabled: Boolean = false
            override val isHermesEnabled: Boolean = true
        }

    override fun onCreate() {
        super.onCreate()
        SoLoader.init(this, OpenSourceMergedSoMapping)
    }
}
