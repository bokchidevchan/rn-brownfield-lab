package com.example.bench

import android.os.Bundle
import android.os.Handler
import android.os.Looper
import android.os.SystemClock
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.example.bench.databinding.ActivityMainBinding
import com.example.bench.rn.RnActivity
import com.example.bench.web.WebViewActivity
import com.example.bench.web.WebViewWarmer

/**
 * 손으로 눌러 볼 수 있는 화면이자, adb 로 자동 측정을 돌리는 진입점입니다.
 *
 * 사람이 스크린샷을 읽어서 숫자를 옮기면 반복이 안 되고 편차도 못 냅니다.
 * 그래서 Intent 로 조건을 받아 스스로 화면 전환을 실행하고 결과를 logcat 에 남깁니다.
 *
 *   adb shell am start -n com.example.bench.debug/com.example.bench.MainActivity \
 *     --es auto webview --ez warm false
 *
 * warm=true 면 런타임을 미리 띄우고 delayMs 뒤에 전환합니다.
 * "앱이 유휴 상태일 때 준비해 두고, 나중에 사용자가 누른다"를 흉내 낸 것입니다.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private val handler = Handler(Looper.getMainLooper())

    private val resultLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { r ->
            binding.resultText.text = if (r.resultCode == RESULT_OK) {
                val action = r.data?.getStringExtra("action").orEmpty()
                val id = r.data?.getStringExtra("productId").orEmpty()
                "결과: $action ($id)"
            } else {
                "결과 없이 닫힘"
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.openWeb.setOnClickListener { launchWeb() }
        binding.openRn.setOnClickListener { launchRn() }
        binding.warmWeb.setOnClickListener {
            WebViewWarmer.warmUp(this)
            updateStatus()
        }
        binding.warmRn.setOnClickListener {
            (application as BenchApplication).reactNativeHost
                .reactInstanceManager.createReactContextInBackground()
            Bench.log("rn_warmup_started")
            updateStatus()
        }

        handleAuto()
        updateStatus()
    }

    override fun onResume() {
        super.onResume()
        updateStatus()
    }

    private fun handleAuto() {
        val target = intent.getStringExtra("auto") ?: return
        val warm = intent.getBooleanExtra("warm", false)
        // cold 는 앱이 자리를 잡을 시간만 줍니다. 그 전에 누르면 ART 초기화와 겹쳐
        // 측정값이 앱 시작 비용까지 포함하게 됩니다.
        val settleMs = intent.getIntExtra("settleMs", 3000).toLong()

        if (!warm) {
            handler.postDelayed({ launch(target) }, settleMs)
            return
        }

        when (target) {
            "webview" -> WebViewWarmer.warmUp(this)
            "rn" -> (application as BenchApplication).reactNativeHost
                .reactInstanceManager.createReactContextInBackground()
        }

        // 고정 지연으로 기다리면 준비가 덜 끝난 채로 눌러서 cold 로 기록됩니다.
        // 실제로 준비됐는지 확인하고 누릅니다.
        waitUntilWarm(target, deadlineMs = SystemClock.elapsedRealtime() + 20_000)
    }

    private fun waitUntilWarm(target: String, deadlineMs: Long) {
        val ready = when (target) {
            "webview" -> WebViewWarmer.isWarmed
            "rn" -> (application as BenchApplication).reactNativeHost.hasInstance()
            else -> true
        }
        if (ready) {
            // 준비 직후 바로 누르면 초기화 마무리 작업과 겹칩니다. 한 박자 둡니다.
            handler.postDelayed({ launch(target) }, 1500)
            return
        }
        if (SystemClock.elapsedRealtime() > deadlineMs) {
            Bench.log("warmup_timeout_$target")
            launch(target)
            return
        }
        handler.postDelayed({ waitUntilWarm(target, deadlineMs) }, 200)
    }

    private fun launch(target: String) {
        when (target) {
            "webview" -> launchWeb()
            "rn" -> launchRn()
        }
    }

    private fun launchWeb() {
        // 이 한 줄이 측정의 시작점입니다. 사용자가 버튼을 누른 순간에 해당합니다.
        Bench.start(if (WebViewWarmer.isWarmed) "webview_warm" else "webview_cold")
        resultLauncher.launch(WebViewActivity.intentFor(this, "SKU-1024"))
    }

    private fun launchRn() {
        val created = (application as BenchApplication).reactNativeHost.hasInstance()
        Bench.start(if (created) "rn_warm" else "rn_cold")
        resultLauncher.launch(RnActivity.intentFor(this, "SKU-1024"))
    }

    private fun updateStatus() {
        val rn = (application as BenchApplication).reactNativeHost.hasInstance()
        binding.statusText.text = getString(
            R.string.status,
            if (WebViewWarmer.isWarmed) "준비됨" else "없음",
            if (rn) "준비됨" else "없음",
        )
    }
}
