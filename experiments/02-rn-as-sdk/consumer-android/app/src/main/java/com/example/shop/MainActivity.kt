package com.example.shop

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.example.rnsdk.RnSdk
import com.example.shop.databinding.ActivityMainBinding

/**
 * 순수 네이티브 화면. RN 을 모릅니다.
 *
 * 01 번의 MainActivity 는 RnHostActivity.intentFor(...) 로 moduleName 과
 * initialProps Bundle 을 직접 만들어 넘겼습니다. 여기서는 상품 ID 하나만 넘깁니다.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private var themeIndex = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        // RN 화면이 결과를 돌려주면 여기로 옵니다.
        // 01 번의 registerForActivityResult + Intent extras 파싱이 사라졌습니다.
        RnSdk.setResultListener { result ->
            runOnUiThread {
                binding.resultText.text =
                    getString(R.string.result_received, result.action, result.productId)
            }
        }

        binding.openDetail.setOnClickListener {
            RnSdk.openProductDetail(this, "SKU-1024")
        }

        binding.openEmbedded.setOnClickListener {
            startActivity(Intent(this, EmbeddedActivity::class.java))
        }

        binding.releaseMemory.setOnClickListener {
            RnSdk.releaseMemory()
            binding.resultText.text = getString(R.string.released)
            updateStatus()
        }

        binding.changeTheme.setOnClickListener {
            themeIndex = (themeIndex + 1) % THEMES.size
            RnSdk.notifyThemeChanged(THEMES[themeIndex])
            binding.resultText.text = getString(R.string.theme_sent, THEMES[themeIndex])
        }
    }

    override fun onResume() {
        super.onResume()
        updateStatus()
    }

    private fun updateStatus() {
        binding.sdkStatus.text = getString(
            R.string.sdk_status,
            if (RnSdk.isRunning()) "살아 있음" else "없음",
        )
    }

    companion object {
        private val THEMES = listOf("light", "dark", "sepia")
    }
}
