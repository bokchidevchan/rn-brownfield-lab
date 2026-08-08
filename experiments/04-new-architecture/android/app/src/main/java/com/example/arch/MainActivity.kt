package com.example.arch

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import androidx.appcompat.app.AppCompatActivity
import com.example.arch.databinding.ActivityMainBinding

/**
 * 03 번과 같은 방식으로 adb 에서 조건을 받아 스스로 화면 전환을 실행합니다.
 *
 *   adb shell am start -n com.example.arch/com.example.arch.MainActivity \
 *     --es auto single --ez warm false
 *
 *   auto: single | dual
 *   warm: 엔진을 미리 띄울지
 */
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private val handler = Handler(Looper.getMainLooper())

    private val app: ArchApplication get() = application as ArchApplication

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.openSingle.setOnClickListener { open(dual = false) }
        binding.openDual.setOnClickListener { open(dual = true) }
        binding.warmEngine.setOnClickListener {
            warmEngine()
            updateStatus()
        }

        handleAuto()
        updateStatus()
    }

    override fun onResume() {
        super.onResume()
        updateStatus()
    }

    /**
     * 엔진 예열. 두 아키텍처에서 부르는 함수가 다릅니다.
     *
     * 구: createReactContextInBackground()
     * 신: reactHost.start()
     *
     * 목적은 같습니다. 화면 진입 전에 런타임을 올려 두는 것입니다.
     */
    private fun warmEngine() {
        if (BuildConfig.IS_NEW_ARCH) {
            app.reactHost?.start()
        } else {
            app.reactNativeHost.reactInstanceManager.createReactContextInBackground()
        }
        Bench.log("engine_warmup_started")
    }

    private fun engineReady(): Boolean =
        if (BuildConfig.IS_NEW_ARCH) {
            app.reactHost?.currentReactContext != null
        } else {
            app.reactNativeHost.hasInstance() &&
                app.reactNativeHost.reactInstanceManager.currentReactContext != null
        }

    private fun handleAuto() {
        val target = intent.getStringExtra("auto") ?: return
        val warm = intent.getBooleanExtra("warm", false)
        val dual = target == "dual"

        if (!warm) {
            handler.postDelayed({ open(dual) }, 3000)
            return
        }

        warmEngine()
        waitUntilReady(dual, SystemClock.elapsedRealtime() + 20_000)
    }

    private fun waitUntilReady(dual: Boolean, deadline: Long) {
        if (engineReady()) {
            handler.postDelayed({ open(dual) }, 1500)
            return
        }
        if (SystemClock.elapsedRealtime() > deadline) {
            Bench.log("warmup_timeout")
            open(dual)
            return
        }
        handler.postDelayed({ waitUntilReady(dual, deadline) }, 200)
    }

    private fun open(dual: Boolean) {
        val warm = if (engineReady()) "warm" else "cold"
        val kind = if (dual) "dual" else "single"
        // 이 한 줄이 측정의 시작점입니다.
        Bench.start("${kind}_$warm")
        startActivity(SurfaceActivity.intentFor(this, dual))
    }

    private fun updateStatus() {
        binding.statusText.text = getString(
            R.string.status,
            if (BuildConfig.IS_NEW_ARCH) "신아키텍처 (Fabric)" else "구아키텍처 (Paper)",
            if (engineReady()) "준비됨" else "없음",
        )
    }
}
