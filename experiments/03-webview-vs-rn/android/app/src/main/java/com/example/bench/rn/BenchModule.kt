package com.example.bench.rn

import android.app.Activity
import android.content.Intent
import com.example.bench.Bench
import com.example.bench.BuildConfig
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.ReadableMap

/**
 * 웹뷰 쪽 WebBridge 와 같은 기능입니다.
 * 저쪽은 문자열 type 으로 분기하는 when 문이고, 여기는 메서드 셋입니다.
 */
class BenchModule(
    private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "Bench"

    /**
     * 측정값을 Promise 로 그대로 돌려줍니다.
     *
     * 웹뷰 쪽은 같은 일을 하려고 evaluateJavascript 로 문자열을 주입했습니다.
     * 이스케이프를 잘못하면 조용히 깨지는 코드입니다. 여기는 그럴 여지가 없습니다.
     */
    @ReactMethod
    fun reportFirstPaint(promise: Promise) {
        promise.resolve(Bench.firstPaint().toDouble())
    }

    @ReactMethod
    fun getHostInfo(promise: Promise) {
        promise.resolve(
            Arguments.createMap().apply {
                putString("appVersion", BuildConfig.VERSION_NAME)
                putString("platform", "android")
            },
        )
    }

    @ReactMethod
    fun finishWithResult(result: ReadableMap) {
        val activity = currentActivity ?: return
        val data = Intent()
            .putExtra("productId", if (result.hasKey("productId")) result.getString("productId") else "")
            .putExtra("action", if (result.hasKey("action")) result.getString("action") else "")
        activity.runOnUiThread {
            activity.setResult(Activity.RESULT_OK, data)
            activity.finish()
        }
    }
}
