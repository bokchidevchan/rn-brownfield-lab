package com.example.brownfield

import android.os.Bundle
import androidx.activity.result.contract.ActivityResultContracts
import androidx.appcompat.app.AppCompatActivity
import com.example.brownfield.databinding.ActivityMainBinding
import com.example.brownfield.rn.EmbeddedRnActivity
import com.example.brownfield.rn.HostBridgeModule
import com.example.brownfield.rn.RnHostActivity

/**
 * 호스트 앱의 네이티브 화면. 앱의 진입점은 계속 여기입니다.
 * RN 은 이 화면에서 들어가는 하위 화면일 뿐이라는 게 브라운필드의 전제입니다.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var binding: ActivityMainBinding
    private var themeIndex = 0

    private val rnResultLauncher =
        registerForActivityResult(ActivityResultContracts.StartActivityForResult()) { result ->
            binding.resultText.text = if (result.resultCode == RESULT_OK) {
                val productId = result.data?.getStringExtra(HostBridgeModule.RESULT_PRODUCT_ID)
                val action = result.data?.getStringExtra(HostBridgeModule.RESULT_ACTION)
                getString(R.string.result_received, action.orEmpty(), productId.orEmpty())
            } else {
                getString(R.string.result_none)
            }
        }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityMainBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.preloadState.text = getString(
            R.string.preload_state,
            HostApplication.PRELOAD_REACT_INSTANCE.toString(),
        )

        binding.openProductDetail.setOnClickListener {
            val initialProps = Bundle().apply {
                putString("productId", "SKU-1024")
                putString("entryPoint", "네이티브 목록 → 상세")
                // JS 에서 "네이티브가 화면을 요청한 시점부터 첫 렌더까지"를 재기 위한 값입니다.
                // Bundle 은 Long 을 담을 수 있지만 JS 로 넘어가면 double 이 됩니다.
                // 밀리초 단위 타임스탬프는 double 정밀도 안에 들어와서 이 용도로는 문제없습니다.
                putDouble("launchedAtMs", System.currentTimeMillis().toDouble())
            }
            rnResultLauncher.launch(
                RnHostActivity.intentFor(
                    this,
                    RnHostActivity.MODULE_PRODUCT_DETAIL,
                    initialProps,
                ),
            )
        }

        binding.openSettings.setOnClickListener {
            val initialProps = Bundle().apply { putString("userTier", "PRO") }
            startActivity(
                RnHostActivity.intentFor(this, RnHostActivity.MODULE_SETTINGS, initialProps),
            )
        }

        binding.openEmbedded.setOnClickListener {
            startActivity(EmbeddedRnActivity.intentFor(this))
        }

        binding.changeTheme.setOnClickListener {
            themeIndex = (themeIndex + 1) % THEMES.size
            val theme = THEMES[themeIndex]

            // RN 인스턴스가 아직 없으면(= RN 화면에 한 번도 안 들어갔으면) 보낼 곳이 없습니다.
            // 이벤트는 버퍼링되지 않습니다. 놓치면 그냥 사라집니다.
            // 화면이 뜬 다음 최신 상태를 맞춰야 한다면 initialProps 나 조회형 메서드를 써야 합니다.
            val reactContext = (application as HostApplication)
                .reactNativeHost
                .reactInstanceManager
                .currentReactContext

            HostBridgeModule.emitThemeChanged(reactContext, theme)

            binding.resultText.text = if (reactContext == null) {
                getString(R.string.theme_dropped, theme)
            } else {
                getString(R.string.theme_sent, theme)
            }
        }
    }

    companion object {
        private val THEMES = listOf("light", "dark", "sepia")
    }
}
