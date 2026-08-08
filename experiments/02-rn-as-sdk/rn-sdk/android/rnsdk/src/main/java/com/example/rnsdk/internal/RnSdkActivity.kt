package com.example.rnsdk.internal

import android.content.Context
import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.ReactNativeHost
import com.facebook.react.defaults.DefaultReactActivityDelegate

/**
 * SDK 가 자기 매니페스트에 등록해 두는 Activity 입니다.
 * 소비 앱은 이 클래스의 존재를 모르고, 매니페스트에 아무것도 추가하지 않습니다.
 * AAR 의 매니페스트가 소비 앱 매니페스트로 병합됩니다.
 */
internal class RnSdkActivity : ReactActivity() {

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        object : DefaultReactActivityDelegate(this, PLACEHOLDER, false) {

            /**
             * 이 오버라이드가 이 실험의 핵심입니다.
             *
             * 기본 구현은 이렇습니다.
             *   ((ReactApplication) getPlainActivity().getApplication()).getReactNativeHost()
             *
             * 소비 앱의 Application 은 ReactApplication 을 구현하지 않으므로
             * 그대로 두면 ClassCastException 으로 죽습니다.
             * SDK 가 들고 있는 host 를 돌려주면 소비 앱은 RN 을 몰라도 됩니다.
             * RN 소스 주석도 이 경로를 정식 확장점으로 안내하고 있습니다.
             */
            override fun getReactNativeHost(): ReactNativeHost = SdkReactHost.reactNativeHost

            /**
             * intent 를 여기서 읽습니다. Activity 의 getMainComponentName() 을
             * 오버라이드하면 안 됩니다. ReactActivity 생성자가 필드 초기화로
             * createReactActivityDelegate() 를 부르는데 그때는 intent 가 null 입니다.
             */
            override fun getMainComponentName(): String = SdkReactHost.MODULE_PRODUCT_DETAIL

            override fun getLaunchOptions(): Bundle = Bundle().apply {
                putString("productId", intent.getStringExtra(EXTRA_PRODUCT_ID).orEmpty())
                putDouble("launchedAtMs", intent.getLongExtra(EXTRA_LAUNCHED_AT, 0L).toDouble())
            }
        }

    companion object {
        private const val PLACEHOLDER = ""
        private const val EXTRA_PRODUCT_ID = "rnsdk_product_id"
        private const val EXTRA_LAUNCHED_AT = "rnsdk_launched_at"

        fun intentFor(context: Context, productId: String): Intent =
            Intent(context, RnSdkActivity::class.java).apply {
                putExtra(EXTRA_PRODUCT_ID, productId)
                putExtra(EXTRA_LAUNCHED_AT, System.currentTimeMillis())
            }
    }
}
