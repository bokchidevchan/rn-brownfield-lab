package com.example.brownfield.rn

import android.app.Activity
import android.content.Intent
import com.example.brownfield.BuildConfig
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap
import com.facebook.react.modules.core.DeviceEventManagerModule

/**
 * RN 화면이 호스트 앱에 요청할 수 있는 것들.
 *
 * 브라운필드에서 이 모듈이 커지는 속도가 곧 결합도입니다.
 * "화면을 닫는다", "결과를 돌려준다" 정도는 어쩔 수 없지만,
 * 비즈니스 로직이 여기로 넘어오기 시작하면 RN 화면을 다른 앱으로 옮길 수 없게 됩니다.
 */
class HostBridgeModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = NAME

    /** 결과 없이 그냥 닫습니다. */
    @ReactMethod
    fun closeScreen() {
        val activity = currentActivity ?: return
        activity.runOnUiThread { activity.finish() }
    }

    /**
     * 결과를 네이티브로 넘기고 닫습니다.
     *
     * ReadableMap 은 JS 객체가 브리지를 건너온 형태입니다.
     * 여기서 도메인 타입으로 바꿔 주지 않으면 호출하는 네이티브 코드가 문자열 키에 계속 의존합니다.
     */
    @ReactMethod
    fun finishWithResult(result: ReadableMap) {
        val activity = currentActivity ?: return
        val data = Intent().apply {
            putExtra(RESULT_PRODUCT_ID, result.getStringOrNull("productId"))
            putExtra(RESULT_ACTION, result.getStringOrNull("action"))
        }
        activity.runOnUiThread {
            activity.setResult(Activity.RESULT_OK, data)
            activity.finish()
        }
    }

    /** Promise 를 돌려주는 형태. JS 에서 await 로 받습니다. */
    @ReactMethod
    fun getHostInfo(promise: Promise) {
        try {
            val info = Arguments.createMap().apply {
                putString("appVersion", BuildConfig.VERSION_NAME)
                putString("platform", "android")
                putBoolean("isDebug", BuildConfig.DEBUG)
            }
            promise.resolve(info)
        } catch (e: Exception) {
            promise.reject(ERROR_HOST_INFO, e)
        }
    }

    /**
     * NativeEventEmitter 를 쓰면 RN 이 이 두 메서드를 호출합니다.
     * 없으면 콘솔에 경고가 뜹니다. 실제로 할 일은 없어서 비워 둡니다.
     */
    @ReactMethod
    @Suppress("UNUSED_PARAMETER")
    fun addListener(eventName: String) = Unit

    @ReactMethod
    @Suppress("UNUSED_PARAMETER")
    fun removeListeners(count: Int) = Unit

    companion object {
        const val NAME = "HostBridge"
        const val RESULT_PRODUCT_ID = "productId"
        const val RESULT_ACTION = "action"
        private const val ERROR_HOST_INFO = "E_HOST_INFO"
        private const val EVENT_THEME_CHANGED = "hostThemeChanged"

        /**
         * 네이티브 → RN 단방향 이벤트.
         *
         * reactContext 가 null 이면 RN 인스턴스가 아직 안 만들어진 것입니다.
         * 브라운필드에서는 이 상태가 정상적으로 자주 발생합니다(RN 화면에 한 번도 안 들어간 경우).
         * 그래서 호출하는 쪽에서 null 을 항상 다뤄야 합니다.
         */
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

private fun ReadableMap.getStringOrNull(key: String): String? =
    if (hasKey(key)) getString(key) else null
