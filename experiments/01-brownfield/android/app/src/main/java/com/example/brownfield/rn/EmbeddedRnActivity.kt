package com.example.brownfield.rn

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import com.example.brownfield.HostApplication
import com.example.brownfield.R
import com.facebook.react.ReactInstanceManager
import com.facebook.react.ReactRootView
import com.facebook.react.modules.core.DefaultHardwareBackBtnHandler

/**
 * 진입점 2: 네이티브 화면 안에 RN 을 부분 삽입하는 경우.
 *
 * ReactActivity 상속을 못 쓰는 상황(공통 BaseActivity 가 이미 있거나, 화면의 일부만 RN 인 경우)
 * 에서 쓰는 방식입니다. 툴바와 하단 안내는 네이티브가 그리고, 가운데만 RN 이 그립니다.
 *
 * 대신 ReactActivity 가 해 주던 걸 전부 손으로 연결해야 합니다.
 * 아래 onResume/onPause/onDestroy/onBackPressed 네 개가 그 값입니다.
 * 이 중 하나만 빠져도 증상이 바로 안 보이고 나중에 터집니다.
 * (onHostPause 누락 → 백그라운드에서도 타이머가 돌고, onHostDestroy 누락 → 컨텍스트 누수)
 */
class EmbeddedRnActivity : AppCompatActivity(), DefaultHardwareBackBtnHandler {

    private lateinit var reactRootView: ReactRootView

    private val reactInstanceManager: ReactInstanceManager
        get() = (application as HostApplication).reactNativeHost.reactInstanceManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_embedded)

        reactRootView = ReactRootView(this)

        // ReactActivity 의 getLaunchOptions 에 해당하는 자리입니다.
        val initialProps = Bundle().apply {
            putString("userTier", "PRO")
        }

        // 여기서 넘기는 reactInstanceManager 가 HostApplication 의 것과 같습니다.
        // 그래서 RnHostActivity 로 띄운 화면과 JS 컨텍스트를 공유합니다.
        // 화면 안의 마운트 카운터가 이어지는 걸로 확인할 수 있습니다.
        reactRootView.startReactApplication(
            reactInstanceManager,
            RnHostActivity.MODULE_SETTINGS,
            initialProps,
        )

        findViewById<FrameLayout>(R.id.rn_container).addView(reactRootView)
    }

    override fun onResume() {
        super.onResume()
        reactInstanceManager.onHostResume(this, this)
    }

    override fun onPause() {
        super.onPause()
        reactInstanceManager.onHostPause(this)
    }

    override fun onDestroy() {
        super.onDestroy()
        // 순서가 중요합니다. 루트뷰를 먼저 떼고 호스트를 정리합니다.
        reactRootView.unmountReactApplication()
        reactInstanceManager.onHostDestroy(this)
    }

    @Suppress("DEPRECATION")
    override fun onBackPressed() {
        // RN 이 먼저 뒤로가기를 처리할 기회를 줍니다(모달 닫기 등).
        // 처리할 게 없으면 RN 이 invokeDefaultOnBackPressed 를 다시 불러 줍니다.
        reactInstanceManager.onBackPressed()
    }

    override fun invokeDefaultOnBackPressed() {
        finish()
    }

    companion object {
        fun intentFor(context: Context): Intent =
            Intent(context, EmbeddedRnActivity::class.java)
    }
}
