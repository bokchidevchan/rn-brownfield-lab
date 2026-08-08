package com.example.rnsdk.internal

import android.app.Application
import com.example.rnsdk.RnSdk
import com.facebook.react.ReactInstanceManager
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.bridge.ReactContext
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.shell.MainReactPackage
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader

/**
 * 01 번의 HostApplication 이 하던 일을 SDK 안으로 가져온 것입니다.
 *
 * 가장 큰 차이는 소비 앱의 Application 이 ReactApplication 을 구현하지 않는다는 점입니다.
 * 그래서 RN 이 기본으로 쓰는 경로
 *
 *   ((ReactApplication) activity.getApplication()).getReactNativeHost()
 *
 * 가 통하지 않습니다. 대신 ReactActivityDelegate 의 getReactNativeHost() 를 오버라이드해서
 * 이 객체를 돌려줍니다. RnSdkActivity 에 그 코드가 있습니다.
 *
 * 또 하나. autolinking 이 없으므로 PackageList 가 생성되지 않습니다.
 * RN 코어 모듈들을 MainReactPackage 로 직접 넣어 줘야 합니다.
 */
internal object SdkReactHost {

    const val MODULE_PRODUCT_DETAIL = "RNProductDetail"
    const val MODULE_SETTINGS = "RNSettings"

    private lateinit var application: Application
    private lateinit var config: RnSdk.Config

    var resultListener: ((RnSdk.CartResult) -> Unit)? = null

    private var host: ReactNativeHost? = null

    fun initialize(application: Application, config: RnSdk.Config) {
        this.application = application
        this.config = config

        // 01 번에서는 소비 앱이 직접 불러야 했습니다. 여기서는 SDK 가 책임집니다.
        // 기존 앱이 이미 SoLoader 를 쓰고 있어도 두 번 호출은 안전합니다.
        SoLoader.init(application, OpenSourceMergedSoMapping)

        if (config.preloadOnInit) {
            reactNativeHost.reactInstanceManager.createReactContextInBackground()
        }
    }

    val hostConfig: RnSdk.Config
        get() = config

    val reactNativeHost: ReactNativeHost
        get() = host ?: createHost().also { host = it }

    val reactInstanceManager: ReactInstanceManager
        get() = reactNativeHost.reactInstanceManager

    val currentReactContext: ReactContext?
        get() = host?.takeIf { it.hasInstance() }?.reactInstanceManager?.currentReactContext

    val isCreated: Boolean
        get() = host?.hasInstance() == true

    fun destroy() {
        host?.takeIf { it.hasInstance() }?.clear()
        host = null
    }

    private fun createHost(): ReactNativeHost =
        object : DefaultReactNativeHost(application) {

            /**
             * autolinking 이 만들어 주던 PackageList 가 없습니다.
             * MainReactPackage 가 RN 코어의 뷰 매니저와 모듈(Text, View, ScrollView,
             * Networking 등)을 담고 있어서 이것만 넣으면 기본 화면은 돕니다.
             * 서드파티 RN 라이브러리를 쓰려면 그 라이브러리의 Package 도 여기 손으로 넣어야 합니다.
             * SDK 로 뺄 때 늘어나는 유지보수 지점입니다.
             */
            override fun getPackages(): List<ReactPackage> = listOf(
                MainReactPackage(),
                SdkBridgePackage(),
            )

            override fun getJSMainModuleName(): String = "index"

            /**
             * 번들을 어디서 읽을지. 01 번과 갈리는 지점입니다.
             *
             * 01 번은 릴리스 빌드 때 Gradle 이 앱 assets 에 번들을 넣어 줬습니다.
             * 여기서는 AAR 안의 assets 에 이미 들어 있습니다. 소비 앱은 아무것도 안 합니다.
             * AAR 의 assets 는 빌드할 때 소비 앱 APK 로 병합됩니다.
             */
            override fun getBundleAssetName(): String = "index.android.bundle"

            override fun getUseDeveloperSupport(): Boolean = config.useDeveloperSupport

            override val isNewArchEnabled: Boolean = false

            override val isHermesEnabled: Boolean = true
        }
}
