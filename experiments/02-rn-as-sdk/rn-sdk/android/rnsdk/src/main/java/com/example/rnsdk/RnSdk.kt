package com.example.rnsdk

import android.app.Application
import android.content.Context
import android.view.View
import com.example.rnsdk.internal.RnSdkActivity
import com.example.rnsdk.internal.RnSdkView
import com.example.rnsdk.internal.SdkBridgeModule
import com.example.rnsdk.internal.SdkReactHost

/**
 * 이 SDK 의 전부입니다. 소비 앱이 보는 API 는 이 파일 하나입니다.
 *
 * 01 번과 비교하면 소비 앱에서 사라진 것들이 이렇습니다.
 *
 *   ReactApplication 인터페이스 구현       → 필요 없음
 *   ReactNativeHost 생성과 보관            → SDK 내부
 *   SoLoader.init                          → SDK 내부
 *   ReactActivity 상속과 매니페스트 등록    → SDK 내부
 *   moduleName 문자열                       → SDK 내부
 *   ReactRootView, ReactPackage, Bundle    → 타입이 노출되지 않음
 *
 * 소비 앱의 코드에는 com.facebook.react 가 한 번도 등장하지 않습니다.
 * 그게 이 실험에서 확인하려는 것입니다.
 */
object RnSdk {

    /**
     * 소비 앱이 자기를 소개하는 값입니다.
     * SDK 는 어떤 앱에 붙었는지 이 시점에 처음 알게 됩니다.
     */
    data class Config(
        val appName: String,
        val appVersion: String,
        /** Metro 에 붙어서 개발할 때만 true. 배포 빌드는 false 로 두고 내장 번들을 씁니다. */
        val useDeveloperSupport: Boolean = false,
        /** true 면 initialize 시점에 RN 인스턴스를 미리 만듭니다. */
        val preloadOnInit: Boolean = false,
    )

    /** RN 화면이 돌려주는 결과. RN 의 타입이 아니라 SDK 가 정의한 타입입니다. */
    data class CartResult(val productId: String, val action: String)

    /**
     * Application.onCreate 에서 한 번 부릅니다.
     * 여기서 SoLoader 를 올리고, preloadOnInit 이면 RN 인스턴스까지 만듭니다.
     */
    @JvmStatic
    fun initialize(application: Application, config: Config) {
        SdkReactHost.initialize(application, config)
    }

    /** 상품 상세 화면을 전체 화면으로 엽니다. */
    @JvmStatic
    fun openProductDetail(context: Context, productId: String) {
        context.startActivity(RnSdkActivity.intentFor(context, productId))
    }

    /**
     * 설정 화면을 View 하나로 돌려줍니다. 소비 앱은 원하는 곳에 addView 하면 됩니다.
     *
     * 돌려주는 타입이 ReactRootView 가 아니라 View 입니다.
     * 내부 구현을 Fabric 으로 바꿔도 소비 앱 코드는 그대로입니다.
     * 생명주기 연결은 이 View 가 스스로 합니다(부모의 LifecycleOwner 를 찾아 붙습니다).
     */
    @JvmStatic
    @JvmOverloads
    fun createSettingsView(context: Context, userTier: String = "FREE"): View =
        RnSdkView(context).also { it.start(SdkReactHost.MODULE_SETTINGS, userTier) }

    /** 소비 앱에서 RN 화면으로 테마 변경을 알립니다. */
    @JvmStatic
    fun notifyThemeChanged(theme: String) {
        SdkBridgeModule.emitThemeChanged(SdkReactHost.currentReactContext, theme)
    }

    /** RN 화면이 결과를 돌려줄 때 호출됩니다. null 을 넣으면 해제됩니다. */
    @JvmStatic
    fun setResultListener(listener: ((CartResult) -> Unit)?) {
        SdkReactHost.resultListener = listener
    }

    /**
     * RN 인스턴스를 파괴합니다.
     *
     * 메모리 압박이나 로그아웃 때 부릅니다. 다음 화면 진입에서 다시 만들어집니다.
     * 소비 앱은 "RN 인스턴스"라는 말을 몰라도 되지만, 이 비용은 알아야 해서
     * 이 하나는 API 로 노출합니다.
     */
    @JvmStatic
    fun releaseMemory() {
        SdkReactHost.destroy()
    }

    /** 지금 RN 인스턴스가 살아 있는지. 측정과 디버깅용입니다. */
    @JvmStatic
    fun isRunning(): Boolean = SdkReactHost.isCreated
}
