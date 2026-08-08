package com.example.arch

import android.app.Application
import com.example.arch.rn.BenchPackage
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeHost
import com.facebook.react.ReactPackage
import com.facebook.react.defaults.DefaultNewArchitectureEntryPoint
import com.facebook.react.defaults.DefaultReactHost
import com.facebook.react.defaults.DefaultReactNativeHost
import com.facebook.react.soloader.OpenSourceMergedSoMapping
import com.facebook.soloader.SoLoader

/**
 * 두 아키텍처를 한 앱에 담습니다. 빌드 플래그로 어느 쪽을 쓸지 정합니다.
 *
 * ReactApplication 인터페이스는 두 개를 요구합니다.
 *
 *   reactNativeHost : 구아키텍처. 안에 ReactInstanceManager 가 있습니다
 *   reactHost       : 신아키텍처(bridgeless). Surface 를 만드는 주체입니다
 *
 * RN 이 어느 쪽을 쓸지는 DefaultNewArchitectureEntryPoint 가 정합니다.
 * ReactActivity 를 쓰면 알아서 갈라지는데, 부분 삽입처럼 직접 다루는 자리에서는
 * 우리가 분기를 써야 합니다. SurfaceActivity 에 그 코드가 있습니다.
 */
class ArchApplication : Application(), ReactApplication {

    override val reactNativeHost: ReactNativeHost =
        object : DefaultReactNativeHost(this) {
            override fun getPackages(): List<ReactPackage> =
                PackageList(this@ArchApplication).packages.apply { add(BenchPackage()) }

            override fun getJSMainModuleName(): String = "index"
            override fun getUseDeveloperSupport(): Boolean = false
            override val isNewArchEnabled: Boolean = BuildConfig.IS_NEW_ARCH
            override val isHermesEnabled: Boolean = true
        }

    /**
     * 구아키텍처에서는 이 값이 null 입니다. ReactApplication 인터페이스의 기본 구현이
     * null 을 돌려주게 돼 있어서, 신아키텍처일 때만 채웁니다.
     *
     * DefaultReactHost 는 reactNativeHost 를 받아서 ReactHost 로 바꿔 줍니다.
     * 즉 구아키텍처 설정(패키지 목록, 번들 경로)을 그대로 재사용합니다.
     * 마이그레이션할 때 설정을 다시 쓰지 않아도 되게 만든 다리입니다.
     */
    override val reactHost: ReactHost?
        get() = if (BuildConfig.IS_NEW_ARCH) {
            DefaultReactHost.getDefaultReactHost(applicationContext, reactNativeHost)
        } else {
            null
        }

    override fun onCreate() {
        super.onCreate()
        SoLoader.init(this, OpenSourceMergedSoMapping)

        if (BuildConfig.IS_NEW_ARCH) {
            // Fabric 과 TurboModule 을 켭니다. 이 호출이 없으면 플래그만 켜도
            // 네이티브 쪽 진입점이 구아키텍처로 돕니다.
            DefaultNewArchitectureEntryPoint.load()
        }

        Bench.log("arch=${if (BuildConfig.IS_NEW_ARCH) "new" else "old"}")
    }
}
