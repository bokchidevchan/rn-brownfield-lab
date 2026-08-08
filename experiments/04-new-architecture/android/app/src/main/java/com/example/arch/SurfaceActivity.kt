package com.example.arch

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.widget.FrameLayout
import androidx.appcompat.app.AppCompatActivity
import com.example.arch.databinding.ActivitySurfaceBinding
import com.facebook.react.ReactRootView
// 패키지가 com.facebook.react 가 아니라 interfaces.fabric 입니다.
// 이름만 보고 찾으면 안 나옵니다. Fabric 전용 인터페이스라는 게 경로에 드러납니다.
import com.facebook.react.interfaces.fabric.ReactSurface
import com.facebook.react.modules.core.DefaultHardwareBackBtnHandler

/**
 * 이 파일이 이 실험의 전부입니다.
 *
 * 같은 화면을 두 아키텍처로 각각 띄웁니다. 두 경로를 나란히 두면
 * 무엇이 바뀌었는지가 코드로 보입니다.
 *
 *   구아키텍처: ReactInstanceManager + ReactRootView
 *               생명주기를 앱이 손으로 연결. 화면의 시작과 끝이라는 개념이 없음
 *
 *   신아키텍처: ReactHost + ReactSurface
 *               surface.start() / stop() 로 화면 수명이 명시적
 *
 * 화면을 하나 더 얹는 경우(dual)도 같이 다룹니다. 신아키텍처가 내세우는
 * "엔진 하나 위에 값싼 서피스 여러 개"를 실제로 재기 위해서입니다.
 */
class SurfaceActivity : AppCompatActivity(), DefaultHardwareBackBtnHandler {

    private lateinit var binding: ActivitySurfaceBinding

    // 신아키텍처 경로에서만 씁니다.
    private var surfaces = mutableListOf<ReactSurface>()

    // 구아키텍처 경로에서만 씁니다.
    private var rootViews = mutableListOf<ReactRootView>()

    private val app: ArchApplication get() = application as ArchApplication

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySurfaceBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val dual = intent.getBooleanExtra(EXTRA_DUAL, false)

        if (dual) {
            /**
             * 두 번째 서피스를 첫 번째와 동시에 만들면 둘이 같은 프레임에 그려져서
             * 같은 숫자가 나옵니다. 그건 "동시에 둘"이지 "엔진이 떠 있을 때 하나 더
             * 얹는 비용"이 아닙니다.
             *
             * 첫 서피스가 실제로 그려진 뒤에 시계를 새로 걸고 두 번째를 붙입니다.
             * 그래야 신아키텍처가 내세우는 "서피스는 값싸다"를 잴 수 있습니다.
             */
            Bench.onPaint = { tag ->
                if (tag == "detail") {
                    Bench.onPaint = null
                    runOnUiThread {
                        Bench.start("second")
                        binding.container2.visibility = android.view.View.VISIBLE
                        attach(binding.container2, MODULE_REVIEW)
                    }
                }
            }
        }

        attach(binding.container1, MODULE_DETAIL)
    }

    private fun attach(container: FrameLayout, moduleName: String) {
        val props = Bundle().apply { putString("productId", "SKU-1024") }

        if (BuildConfig.IS_NEW_ARCH) {
            // ── 신아키텍처 ────────────────────────────────────────────────
            // 엔진(ReactHost)에게 화면 하나를 만들어 달라고 요청합니다.
            // 반환되는 ReactSurface 가 그 화면의 핸들입니다.
            val host = app.reactHost ?: error("신아키텍처인데 reactHost 가 null 입니다")
            val surface = host.createSurface(this, moduleName, props)
                ?: error("서피스를 만들지 못했습니다")

            // start() 가 명시적입니다. 구아키텍처에는 이 개념이 없었습니다.
            surface.start()
            surfaces += surface
            surface.view?.let { container.addView(it) }
        } else {
            // ── 구아키텍처 ────────────────────────────────────────────────
            // RootView 를 앱이 직접 만들고 인스턴스 매니저를 넘깁니다.
            // "화면을 시작한다"에 해당하는 것이 startReactApplication 인데,
            // 대응하는 "멈춘다"가 unmount 뿐이라 대칭이 약합니다.
            val rootView = ReactRootView(this)
            rootView.startReactApplication(
                app.reactNativeHost.reactInstanceManager,
                moduleName,
                props,
            )
            rootViews += rootView
            container.addView(rootView)
        }
    }

    override fun onResume() {
        super.onResume()
        if (BuildConfig.IS_NEW_ARCH) {
            app.reactHost?.onHostResume(this, this)
        } else {
            app.reactNativeHost.reactInstanceManager.onHostResume(this, this)
        }
    }

    override fun onPause() {
        super.onPause()
        if (BuildConfig.IS_NEW_ARCH) {
            app.reactHost?.onHostPause(this)
        } else {
            app.reactNativeHost.reactInstanceManager.onHostPause(this)
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        Bench.onPaint = null
        if (BuildConfig.IS_NEW_ARCH) {
            // 화면 단위로 멈춥니다. 엔진은 그대로 살아 있습니다.
            // 이 대칭성이 구아키텍처와 갈리는 지점입니다.
            surfaces.forEach { it.stop() }
            surfaces.clear()
            app.reactHost?.onHostDestroy(this)
        } else {
            rootViews.forEach { it.unmountReactApplication() }
            rootViews.clear()
            app.reactNativeHost.reactInstanceManager.onHostDestroy(this)
        }
    }

    @Suppress("DEPRECATION")
    override fun onBackPressed() {
        val handled = if (BuildConfig.IS_NEW_ARCH) {
            app.reactHost?.onBackPressed() ?: false
        } else {
            app.reactNativeHost.reactInstanceManager.onBackPressed()
            true
        }
        if (!handled) finish()
    }

    override fun invokeDefaultOnBackPressed() {
        finish()
    }

    companion object {
        const val MODULE_DETAIL = "ProductDetail"
        const val MODULE_REVIEW = "Review"
        private const val EXTRA_DUAL = "extra_dual"

        fun intentFor(context: Context, dual: Boolean = false): Intent =
            Intent(context, SurfaceActivity::class.java).apply {
                putExtra(EXTRA_DUAL, dual)
            }
    }
}
