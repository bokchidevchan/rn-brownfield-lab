package com.example.shop

import android.app.Application
import com.example.rnsdk.RnSdk

/**
 * 01 번의 HostApplication 과 비교해 보세요.
 *
 * 01 번:
 *   class HostApplication : Application(), ReactApplication {
 *       override val reactNativeHost: ReactNativeHost = object : DefaultReactNativeHost(this) {
 *           override fun getPackages() = PackageList(this@HostApplication).packages.apply { ... }
 *           override fun getJSMainModuleName() = "index"
 *           override fun getUseDeveloperSupport() = BuildConfig.DEBUG
 *           override val isNewArchEnabled = false
 *           override val isHermesEnabled = true
 *       }
 *       override fun onCreate() {
 *           super.onCreate()
 *           SoLoader.init(this, OpenSourceMergedSoMapping)
 *       }
 *   }
 *
 * 여기서는 ReactApplication 도, ReactNativeHost 도, SoLoader 도 없습니다.
 * 이 파일 전체에 com.facebook 이 한 번도 안 나옵니다.
 */
class ShopApplication : Application() {

    override fun onCreate() {
        super.onCreate()

        RnSdk.initialize(
            this,
            RnSdk.Config(
                appName = getString(R.string.app_name),
                appVersion = BuildConfig.VERSION_NAME,
                // 개발 중 Metro 에 붙으려면 true.
                // 기본은 false 이고 AAR 안에 들어 있는 번들을 씁니다.
                useDeveloperSupport = false,
                // 앱 시작 때 RN 인스턴스를 미리 만들지. 01 번의 PRELOAD_REACT_INSTANCE 와 같은 스위치인데,
                // 이제는 SDK 의 설정값이라 앱 팀이 코드를 고치지 않고 켜고 끌 수 있습니다.
                preloadOnInit = false,
            ),
        )
    }
}
