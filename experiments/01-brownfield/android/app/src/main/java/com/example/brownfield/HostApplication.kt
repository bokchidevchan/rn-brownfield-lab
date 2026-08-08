package com.example.brownfield

import android.app.Application
import com.example.brownfield.rn.HostBridgePackage
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader

/**
 * ReactNativeHost 는 앱 전체에서 하나입니다.
 *
 * 여기 붙은 ReactInstanceManager 가 JS 컨텍스트를 들고 있고, RN 화면들이 그걸 공유합니다.
 * 화면마다 Host 를 새로 만들면 화면 수만큼 JS 컨텍스트가 생겨서 메모리와 진입 시간이 그만큼
 * 늘어납니다. 그렇게 해야 하는 경우(완전히 격리된 미니앱 등)가 아니면 하나로 둡니다.
 */
class HostApplication : Application(), ReactApplication {

    override val reactNativeHost: ReactNativeHost =
        object : DefaultReactNativeHost(this) {

            override fun getPackages(): List<ReactPackage> =
                // PackageList 는 autolinking 이 생성한 목록입니다.
                // 직접 만든 네이티브 모듈은 여기에 손으로 더합니다.
                PackageList(this@HostApplication).packages.apply {
                    add(HostBridgePackage())
                }

            override fun getJSMainModuleName(): String = "index"

            override fun getUseDeveloperSupport(): Boolean = BuildConfig.DEBUG

            override val isNewArchEnabled: Boolean = false

            override val isHermesEnabled: Boolean = true
        }

    override fun onCreate() {
        super.onCreate()

        // RN 의 네이티브 라이브러리 로더. RN 을 쓰는 화면에 들어가기 전에 반드시 한 번 돌아야 합니다.
        // 기존 앱이 이미 SoLoader 를 쓰고 있다면 중복 init 이 되지 않게 정리해야 합니다.
        SoLoader.init(this, OpenSourceMergedSoMapping)

        if (PRELOAD_REACT_INSTANCE) {
            // 앱 시작 시점에 JS 컨텍스트를 미리 만듭니다.
            // RN 화면 진입은 빨라지지만 콜드 스타트가 그만큼 느려집니다.
            // 두 값을 같이 재지 않으면 "빨라졌다"는 판단을 못 합니다.
            reactNativeHost.reactInstanceManager.createReactContextInBackground()
        }
    }

    companion object {
        /**
         * RN 인스턴스를 언제 만들 것인가.
         *
         * false: 첫 RN 화면에 들어갈 때 만듭니다. 콜드 스타트에 영향 없음, 첫 진입이 느림.
         * true : 앱 시작 시 미리 만듭니다. 첫 진입이 빠름, 콜드 스타트가 느려짐.
         *
         * 이 값을 바꿔 가며 (콜드 스타트, 첫 RN 화면 진입, 두 번째 진입) 세 개를 재는 게
         * 이 예제의 목적 중 하나입니다.
         */
        const val PRELOAD_REACT_INSTANCE = false
    }
}
