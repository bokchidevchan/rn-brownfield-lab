package com.example.bench.web

import android.annotation.SuppressLint
import android.content.Context
import android.webkit.WebView
import com.example.bench.Bench

/**
 * 웹뷰 프리워밍.
 *
 * RN 의 preload 와 대응시키려고 만든 것입니다. 두 방식 모두 "런타임을 미리 띄워 둔다"가
 * 같은 아이디어입니다.
 *
 * 웹뷰에서 비싼 것은 WebView 뷰 객체 자체가 아니라 그 뒤의 Chromium 초기화입니다.
 * WebView provider 로딩, 렌더러 프로세스 기동, GPU 프로세스 연결이 프로세스 단위로 한 번
 * 일어납니다. 그래서 아무 WebView 나 하나 만들어 두면 그 뒤로는 싸집니다.
 *
 * 여기서는 페이지까지 미리 받아 두지는 않습니다. 그렇게 하면 화면이 이미 그려진 상태라
 * "탭 → 첫 페인트"가 0 에 가깝게 나오는데, RN preload(런타임만 준비, 렌더는 진입 때)와
 * 조건이 달라져서 비교가 안 됩니다.
 */
object WebViewWarmer {

    private var warmed: WebView? = null

    val isWarmed: Boolean
        get() = warmed != null

    @SuppressLint("SetJavaScriptEnabled")
    fun warmUp(context: Context) {
        if (warmed != null) return
        // Application 컨텍스트로 만듭니다. 화면에 붙이지 않을 뷰라 Activity 를 잡고 있으면
        // 그대로 누수입니다. 실무에서 프리워밍이 메모리 문제로 이어지는 지점이기도 합니다.
        val view = WebView(context.applicationContext)
        view.settings.javaScriptEnabled = true
        view.loadUrl("about:blank")
        warmed = view
        Bench.log("webview_warmup_done")
    }

    /** 메모리 압박 때 놓아줍니다. RN 의 인스턴스 파괴와 같은 자리입니다. */
    fun release() {
        warmed?.destroy()
        warmed = null
    }
}
