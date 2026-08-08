package com.example.rnsdk.internal

import android.app.Activity
import android.content.Context
import android.content.ContextWrapper
import android.os.Bundle
import android.widget.FrameLayout
import androidx.lifecycle.DefaultLifecycleObserver
import androidx.lifecycle.LifecycleOwner
import androidx.lifecycle.findViewTreeLifecycleOwner
import com.facebook.react.ReactRootView
import com.facebook.react.modules.core.DefaultHardwareBackBtnHandler

/**
 * 소비 앱에 View 하나로 건네주는 RN 영역.
 *
 * 01 번의 EmbeddedRnActivity 에서는 호스트 앱이 onHostResume, onHostPause,
 * onHostDestroy, onBackPressed 네 개를 손으로 연결해야 했습니다.
 * SDK 로 빼면 그 책임을 소비 앱에 떠넘길 수 없습니다. "이 뷰를 붙이고 나서
 * Activity 에 이 네 개를 추가하세요"라고 하는 순간 SDK 가 아니게 됩니다.
 *
 * 그래서 이 뷰가 부모의 LifecycleOwner 를 스스로 찾아 붙습니다.
 * 소비 앱은 addView 만 하면 됩니다.
 */
internal class RnSdkView(context: Context) : FrameLayout(context), DefaultLifecycleObserver {

    private val reactRootView = ReactRootView(context)
    private var lifecycleOwner: LifecycleOwner? = null
    private var started = false

    private val backHandler = DefaultHardwareBackBtnHandler {
        activity?.finish()
    }

    private val activity: Activity?
        get() {
            var c: Context? = context
            while (c is ContextWrapper) {
                if (c is Activity) return c
                c = c.baseContext
            }
            return null
        }

    fun start(moduleName: String, userTier: String) {
        if (started) return
        started = true
        reactRootView.startReactApplication(
            SdkReactHost.reactInstanceManager,
            moduleName,
            Bundle().apply { putString("userTier", userTier) },
        )
        addView(reactRootView)
    }

    override fun onAttachedToWindow() {
        super.onAttachedToWindow()
        lifecycleOwner = findViewTreeLifecycleOwner()?.also {
            it.lifecycle.addObserver(this)
        }
        if (lifecycleOwner == null) {
            // LifecycleOwner 를 못 찾으면 생명주기를 연결할 수 없습니다.
            // AppCompatActivity 나 Fragment 안이면 항상 찾아집니다.
            // 그렇지 않은 곳에 붙였다면 소비 앱이 알아야 하므로 조용히 넘기지 않습니다.
            error(
                "RnSdk 뷰를 LifecycleOwner 가 없는 곳에 붙였습니다. " +
                    "AppCompatActivity 나 Fragment 의 뷰 계층 안에 넣어야 합니다.",
            )
        }
    }

    override fun onDetachedFromWindow() {
        super.onDetachedFromWindow()
        lifecycleOwner?.lifecycle?.removeObserver(this)
        lifecycleOwner = null
        if (started) {
            // 순서가 중요합니다. 루트뷰를 먼저 떼고 호스트를 정리합니다.
            reactRootView.unmountReactApplication()
            started = false
        }
    }

    override fun onResume(owner: LifecycleOwner) {
        activity?.let { SdkReactHost.reactInstanceManager.onHostResume(it, backHandler) }
    }

    override fun onPause(owner: LifecycleOwner) {
        activity?.let { SdkReactHost.reactInstanceManager.onHostPause(it) }
    }

    override fun onDestroy(owner: LifecycleOwner) {
        activity?.let { SdkReactHost.reactInstanceManager.onHostDestroy(it) }
    }
}
