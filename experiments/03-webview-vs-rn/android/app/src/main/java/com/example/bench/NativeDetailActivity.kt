package com.example.bench

import android.content.Context
import android.content.Intent
import android.os.Bundle
import android.os.SystemClock
import android.widget.TextView
import androidx.appcompat.app.AppCompatActivity
import androidx.core.view.doOnPreDraw

/**
 * 상품 상세의 순수 네이티브 판. WebViewActivity, RnActivity 와 나란히 놓는 세 번째 기준점입니다.
 *
 * 런타임을 하나도 부팅하지 않을 때의 진입 시간과 메모리(11번 실험)를 재기 위해 있습니다.
 * 화면 구성은 두 판과 같습니다. 섹션 4개, 행 6개, 버튼 2개.
 */
class NativeDetailActivity : AppCompatActivity() {

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_native)

        openCount += 1

        val productId = intent.getStringExtra(EXTRA_PRODUCT_ID) ?: "(없음)"
        findViewById<TextView>(R.id.product_id).text = productId
        findViewById<TextView>(R.id.entry_point).text =
            intent.getStringExtra(EXTRA_ENTRY_POINT) ?: "(없음)"
        findViewById<TextView>(R.id.mount_count).text = openCount.toString()

        // 웹뷰의 double rAF, RN 의 InteractionManager 뒤 rAF 두 번과 같은 의도입니다.
        // 첫 프레임이 화면에 나간 다음에 기록해야 세 방식의 정의가 같아집니다.
        val ttfp = findViewById<TextView>(R.id.ttfp)
        window.decorView.doOnPreDraw {
            ttfp.post {
                val elapsed = Bench.firstPaint()
                ttfp.text = if (elapsed < 0) "-" else "${elapsed}ms"
            }
        }

        findViewById<TextView>(R.id.host_info_button).setOnClickListener {
            // RN 은 await 한 줄, 웹뷰는 브리지 배관 한 벌이 드는 자리가
            // 여기서는 같은 프로세스의 함수 호출입니다.
            val t0 = SystemClock.elapsedRealtime()
            findViewById<TextView>(R.id.app_version).text = BuildConfig.VERSION_NAME
            findViewById<TextView>(R.id.rtt).text =
                "${SystemClock.elapsedRealtime() - t0}ms"
        }

        findViewById<TextView>(R.id.close_button).setOnClickListener {
            setResult(
                RESULT_OK,
                Intent()
                    .putExtra("productId", productId)
                    .putExtra("action", "ADD_TO_CART"),
            )
            finish()
        }
    }

    companion object {
        private const val EXTRA_PRODUCT_ID = "extra_product_id"
        private const val EXTRA_ENTRY_POINT = "extra_entry_point"

        // RN 의 mountCount(JS 컨텍스트 수명), 웹뷰의 sessionStorage 카운터와 짝입니다.
        // 네이티브는 프로세스가 곧 수명이라 프로세스가 살아 있는 동안 올라갑니다.
        private var openCount = 0

        fun intentFor(context: Context, productId: String): Intent =
            Intent(context, NativeDetailActivity::class.java)
                .putExtra(EXTRA_PRODUCT_ID, productId)
                .putExtra(EXTRA_ENTRY_POINT, "네이티브 목록")
    }
}
