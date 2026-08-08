package com.example.shop

import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import com.example.rnsdk.RnSdk
import com.example.shop.databinding.ActivityEmbeddedBinding

/**
 * 네이티브 화면 안에 SDK 뷰를 부분 삽입합니다.
 *
 * 01 번의 EmbeddedRnActivity 와 비교하면 사라진 코드가 이렇습니다.
 *
 *   private lateinit var reactRootView: ReactRootView
 *   private val reactInstanceManager get() = (application as HostApplication)...
 *   reactRootView.startReactApplication(reactInstanceManager, MODULE, props)
 *   override fun onResume()  { reactInstanceManager.onHostResume(this, this) }
 *   override fun onPause()   { reactInstanceManager.onHostPause(this) }
 *   override fun onDestroy() { reactRootView.unmountReactApplication(); ... }
 *   override fun onBackPressed() { reactInstanceManager.onBackPressed() }
 *   class EmbeddedRnActivity : ..., DefaultHardwareBackBtnHandler
 *
 * 여기서는 addView 한 줄입니다. 생명주기는 SDK 뷰가 부모의 LifecycleOwner 를 찾아
 * 스스로 붙습니다. 빠뜨릴 수 있는 코드를 앱 팀에게 주지 않는 게 SDK 의 일입니다.
 */
class EmbeddedActivity : AppCompatActivity() {

    private lateinit var binding: ActivityEmbeddedBinding
    private var themeIndex = 0

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityEmbeddedBinding.inflate(layoutInflater)
        setContentView(binding.root)

        binding.rnContainer.addView(RnSdk.createSettingsView(this, userTier = "PRO"))

        binding.changeTheme.setOnClickListener {
            themeIndex = (themeIndex + 1) % THEMES.size
            RnSdk.notifyThemeChanged(THEMES[themeIndex])
        }
    }

    companion object {
        private val THEMES = listOf("light", "dark", "sepia")
    }
}
