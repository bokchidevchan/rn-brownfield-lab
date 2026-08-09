package com.example.navlab

import android.annotation.SuppressLint
import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.activity.OnBackPressedCallback
import androidx.appcompat.app.AppCompatActivity

/**
 * 웹뷰 네비게이션 실험대입니다.
 *
 * 03 번의 웹뷰 화면과 다른 점이 두 가지 있고, 둘 다 의도한 것입니다.
 *
 * 1. WebViewClient 를 답니다.
 *    03 번에는 없었는데, 없으면 링크를 누를 때마다 외부 크롬으로 빠져나갑니다.
 *    측정용으로 화면 하나만 띄울 때는 문제가 안 됐지만, 화면을 오가는
 *    실험에서는 이게 없으면 실험 자체가 성립하지 않습니다.
 *    실무에서 웹뷰를 붙일 때 가장 먼저 깨닫는 것이기도 합니다.
 *
 * 2. 백 버튼을 웹뷰에 넘겨줄지 말지를 토글로 둡니다.
 *    이게 이 실험의 핵심입니다. Stackflow 를 붙이면 웹 안에서는 스택이
 *    생기지만, 안드로이드 백 버튼은 여전히 앱의 것입니다. 앱이 넘겨주지
 *    않으면 화면 전체가 닫힙니다. 라이브러리가 대신 해 줄 수 없는 영역이라
 *    직접 눌러 보고 차이를 확인할 수 있게 했습니다.
 */
class MainActivity : AppCompatActivity() {

    private lateinit var webView: WebView

    /** 인텐트로 켜고 끕니다. 기본값은 꺼짐(웹 스택 무시). */
    private var forwardBackToWeb = false

    @SuppressLint("SetJavaScriptEnabled")
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val url = intent.getStringExtra(EXTRA_URL) ?: DEFAULT_URL
        forwardBackToWeb = intent.getBooleanExtra(EXTRA_FORWARD_BACK, false)

        webView = WebView(this).apply {
            settings.javaScriptEnabled = true
            settings.domStorageEnabled = true
            // 이 한 줄이 없으면 링크와 location 변경이 전부 외부 브라우저로 나갑니다.
            webViewClient = WebViewClient()
        }
        setContentView(webView)
        webView.loadUrl(url)

        onBackPressedDispatcher.addCallback(this, object : OnBackPressedCallback(true) {
            override fun handleOnBackPressed() {
                // 켜져 있으면 웹뷰 히스토리를 먼저 되돌립니다.
                // Stackflow 의 스택은 History API 위에 있으므로 이게 곧 pop 입니다.
                if (forwardBackToWeb && webView.canGoBack()) {
                    webView.goBack()
                    return
                }
                // 꺼져 있으면 웹이 몇 단계를 쌓았든 화면이 통째로 닫힙니다.
                isEnabled = false
                onBackPressedDispatcher.onBackPressed()
            }
        })
    }

    override fun onDestroy() {
        webView.destroy()
        super.onDestroy()
    }

    companion object {
        const val EXTRA_URL = "url"
        const val EXTRA_FORWARD_BACK = "forwardBack"

        // 에뮬레이터에서 호스트 머신을 가리키는 주소입니다.
        const val DEFAULT_URL = "http://10.0.2.2:4300/"
    }
}
