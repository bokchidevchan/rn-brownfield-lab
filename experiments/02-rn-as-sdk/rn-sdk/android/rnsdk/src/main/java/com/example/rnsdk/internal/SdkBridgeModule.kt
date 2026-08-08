package com.example.rnsdk.internal

import com.example.rnsdk.RnSdk
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * 01 번의 HostBridgeModule 과 형태는 같지만 붙는 대상이 다릅니다.
 *
 * 01 번은 Activity 를 직접 만지고 setResult 로 결과를 돌려줬습니다.
 * 여기서는 SDK 가 노출한 리스너(RnSdk.setResultListener)로 넘깁니다.
 * RN 화면이 소비 앱의 화면 전환 방식을 알 필요가 없어집니다.
 */
internal class SdkBridgeModule(
    reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = NAME

    @ReactMethod
    fun close() {
        val activity = currentActivity ?: return
        activity.runOnUiThread { activity.finish() }
    }

    @ReactMethod
    fun finishWithResult(result: ReadableMap) {
        val cartResult = RnSdk.CartResult(
            productId = result.getStringOrEmpty("productId"),
            action = result.getStringOrEmpty("action"),
        )
        val activity = currentActivity
        activity?.runOnUiThread {
            // 결과를 먼저 넘기고 닫습니다. 순서가 반대면 소비 앱이 화면을 다시 그리는
            // 시점과 겹쳐서 리스너가 늦게 불립니다.
            SdkReactHost.resultListener?.invoke(cartResult)
            activity.finish()
        } ?: SdkReactHost.resultListener?.invoke(cartResult)
    }

    /**
     * 소비 앱이 initialize 에서 넘긴 값을 그대로 돌려줍니다.
     * RN 화면은 어떤 앱 안에 들어와 있는지 이걸로만 압니다.
     */
    @ReactMethod
    fun getHostInfo(promise: Promise) {
        try {
            val config = SdkReactHost.hostConfig
            promise.resolve(
                Arguments.createMap().apply {
                    putString("appName", config.appName)
                    putString("appVersion", config.appVersion)
                    putString("platform", "android")
                },
            )
        } catch (e: Exception) {
            promise.reject("E_HOST_INFO", e)
        }
    }

    @ReactMethod
    @Suppress("UNUSED_PARAMETER")
    fun addListener(eventName: String) = Unit

    @ReactMethod
    @Suppress("UNUSED_PARAMETER")
    fun removeListeners(count: Int) = Unit

    /**
     * 이 모듈은 SdkReactHost 의 리스너만 참조하고 외부 싱글턴에 콜백을 걸지 않습니다.
     * 걸었다면 여기서 해제해야 합니다. 안 하면 인스턴스를 파괴해도 옛 인스턴스가
     * 통째로 살아남고, 재생성할 때마다 이벤트가 중복 발화합니다.
     */
    override fun invalidate() {
        super.invalidate()
    }

    companion object {
        const val NAME = "RnSdkBridge"
        private const val EVENT_THEME_CHANGED = "themeChanged"

        fun emitThemeChanged(reactContext: ReactContext?, theme: String) {
            reactContext
                ?.getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
                ?.emit(
                    EVENT_THEME_CHANGED,
                    Arguments.createMap().apply { putString("theme", theme) },
                )
        }
    }
}

private fun ReadableMap.getStringOrEmpty(key: String): String =
    if (hasKey(key)) getString(key).orEmpty() else ""
