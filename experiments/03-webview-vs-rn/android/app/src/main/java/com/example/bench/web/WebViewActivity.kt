package com.example.bench.web

import android.annotation.SuppressLint
import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.webkit.JavascriptInterface
import android.webkit.WebView
import androidx.appcompat.app.AppCompatActivity
import com.example.bench.Bench
import com.example.bench.BuildConfig
import com.example.bench.R
import org.json.JSONObject

/**
 * 웹뷰로 상품 상세를 띄웁니다.
 *
 * RN 쪽 RnActivity 와 나란히 놓고 보세요. 코드 길이 차이가 그대로 통신 계층의 무게입니다.
 */
class WebViewActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_web)

        webView = findViewById(R.id.web_view)
        webView.settings.javaScriptEnabled = true
        // 측정 조건을 통제합니다. 캐시를 켜면 두 번째 진입이 빨라지는데,
        // 그건 웹뷰 최적화의 효과지 웹뷰 자체의 성능이 아닙니다. 따로 재야 할 항목입니다.
        webView.settings.cacheMode = android.webkit.WebSettings.LOAD_NO_CACHE

        // RN 의 네이티브 모듈에 해당하는 자리입니다.
        // RN 은 ReactPackage 에 넣으면 JS 에서 NativeModules.Bench 로 바로 보이는데,
        // 여기서는 이름을 문자열로 붙이고 JSON 을 직접 파싱해야 합니다.
        webView.addJavascriptInterface(WebBridge(), "AndroidBridge")

        val url = intent.getStringExtra(EXTRA_URL) ?: DEFAULT_URL
        webView.loadUrl(url)
    }

    override fun onDestroy() {
        super.onDestroy()
        // 웹뷰를 떼지 않으면 Activity 가 통째로 남습니다.
        (webView.parent as? android.view.ViewGroup)?.removeView(webView)
        webView.destroy()
    }

    /**
     * JS 가 부르는 창구. RN 의 @ReactMethod 하나하나에 해당하는 것을
     * 여기서는 문자열 type 으로 분기합니다.
     *
     * 기능이 늘어날수록 이 when 문이 길어지고, 프로토콜을 직접 버전 관리해야 합니다.
     * 웹과 앱의 배포 주기가 달라서 구버전 앱이 신버전 웹을 여는 조합이 항상 존재합니다.
     */
    private inner class WebBridge {

        @JavascriptInterface
        fun postMessage(raw: String) {
            val json = JSONObject(raw)
            when (json.optString("type")) {
                "FIRST_PAINT" -> {
                    val elapsed = Bench.firstPaint()
                    runOnUiThread {
                        // 화면에도 되돌려 줍니다. RN 은 setState 한 줄인데
                        // 여기서는 JS 를 문자열로 주입해야 합니다.
                        webView.evaluateJavascript(
                            "window.__showTtfp && window.__showTtfp($elapsed)",
                            null,
                        )
                    }
                }

                "HOST_INFO" -> {
                    val id = json.optString("id")
                    val payload = JSONObject()
                        .put("appVersion", BuildConfig.VERSION_NAME)
                        .put("platform", "android")
                        .toString()
                    runOnUiThread {
                        // 응답도 문자열 주입입니다. 이스케이프를 잘못하면 조용히 깨집니다.
                        webView.evaluateJavascript(
                            "window.__resolve('$id', ${JSONObject.quote(payload)})",
                            null,
                        )
                    }
                }

                "FINISH" -> {
                    val data = Intent()
                        .putExtra("productId", json.optString("productId"))
                        .putExtra("action", json.optString("action"))
                    runOnUiThread {
                        setResult(RESULT_OK, data)
                        finish()
                    }
                }
            }
        }
    }

    companion object {
        private const val EXTRA_URL = "extra_url"

        // 에뮬레이터에서 호스트를 가리키는 주소입니다. 실기기라면 맥의 LAN IP 로 바꿔야 합니다.
        const val DEFAULT_URL = "http://10.0.2.2:3000/"

        fun intentFor(context: Context, productId: String, url: String = DEFAULT_URL): Intent =
            Intent(context, WebViewActivity::class.java).apply {
                putExtra(EXTRA_URL, "$url?productId=$productId&entryPoint=네이티브%20목록")
            }
    }
}
