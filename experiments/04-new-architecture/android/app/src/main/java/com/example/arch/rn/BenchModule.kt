package com.example.arch.rn

import com.example.arch.Bench
import com.example.arch.BuildConfig
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

/**
 * 이 모듈은 두 아키텍처에서 코드가 같습니다.
 *
 * 구아키텍처에서는 브리지 모듈로, 신아키텍처에서는 인터롭 레이어를 통해 TurboModule 처럼
 * 동작합니다. 완전한 TurboModule 로 만들려면 Codegen 스펙(TS 타입 정의)을 쓰고
 * 생성된 인터페이스를 구현해야 하는데, 그건 라이브러리 저자의 일이고
 * 앱 개발자는 대개 이 상태로 넘어갑니다.
 *
 * 즉 "신아키텍처로 바꾸면 모듈을 다 다시 써야 한다"는 아닙니다.
 * 인터롭 레이어가 기존 모듈을 받아 줍니다.
 */
class BenchModule(
    reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "Bench"

    @ReactMethod
    fun reportFirstPaint(tag: String, promise: Promise) {
        promise.resolve(Bench.firstPaint(tag).toDouble())
    }

    @ReactMethod
    fun getArchInfo(promise: Promise) {
        promise.resolve(
            Arguments.createMap().apply {
                putString("newArch", BuildConfig.IS_NEW_ARCH.toString())
                putString(
                    "entryPath",
                    if (BuildConfig.IS_NEW_ARCH) "ReactHost + ReactSurface"
                    else "ReactInstanceManager + ReactRootView",
                )
                putString("renderer", if (BuildConfig.IS_NEW_ARCH) "Fabric" else "Paper")
            },
        )
    }
}
