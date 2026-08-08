package com.example.bench.rn

import android.content.Context
import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultReactActivityDelegate

/**
 * RN 으로 상품 상세를 띄웁니다. WebViewActivity 와 나란히 놓고 길이를 비교해 보세요.
 *
 * 통신 계층이 통째로 없습니다. 그 자리에 있던 JSON 파싱, type 분기,
 * evaluateJavascript 문자열 주입이 프레임워크 안으로 들어갔습니다.
 */
class RnActivity : ReactActivity() {

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        object : DefaultReactActivityDelegate(this, "", false) {
            override fun getMainComponentName(): String = MODULE

            override fun getLaunchOptions(): Bundle = Bundle().apply {
                putString("productId", intent.getStringExtra(EXTRA_PRODUCT_ID).orEmpty())
                putString("entryPoint", "네이티브 목록")
            }
        }

    companion object {
        const val MODULE = "BenchProductDetail"
        private const val EXTRA_PRODUCT_ID = "extra_product_id"

        fun intentFor(context: Context, productId: String): Intent =
            Intent(context, RnActivity::class.java).apply {
                putExtra(EXTRA_PRODUCT_ID, productId)
            }
    }
}
