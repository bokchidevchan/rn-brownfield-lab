package com.example.brownfield.rn

import android.content.Context
import android.content.Intent
import android.os.Bundle
import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultReactActivityDelegate

/**
 * 진입점 1: 화면 전체를 RN 이 그리는 경우.
 *
 * ReactActivity 를 상속하면 생명주기, 뒤로가기, 개발자 메뉴(흔들기)를 전부 대신 처리해 줍니다.
 * 기존 앱에 이미 공통 BaseActivity 가 있어서 상속을 못 쓰는 상황이면 EmbeddedRnActivity 쪽처럼
 * ReactRootView 를 직접 다뤄야 합니다. 그 경우 생명주기 연결이 전부 수동입니다.
 *
 * 화면 하나짜리 Activity 가 아니라 여러 RN 화면을 이 Activity 하나로 돌립니다.
 * moduleName 을 Intent 로 받기 때문입니다. 화면이 늘어날 때마다 Activity 와
 * 매니페스트 항목을 추가하지 않아도 됩니다.
 */
class RnHostActivity : ReactActivity() {

    /**
     * moduleName 과 initialProps 를 Intent 에서 읽는 코드는 전부 delegate 안에 있습니다.
     * Activity 쪽 getMainComponentName() 을 오버라이드하면 안 됩니다.
     *
     * ReactActivity 의 생성자가 필드 초기화로 createReactActivityDelegate() 를 부르는데,
     * 그 시점에는 Activity 가 아직 attach 되기 전이라 intent 가 null 입니다.
     * 거기서 intent 를 읽으면 화면을 띄우는 순간 NPE 로 죽습니다.
     * delegate 의 getMainComponentName() / getLaunchOptions() 는 나중에
     * delegate.onCreate() 에서 불리기 때문에 그때는 intent 가 준비돼 있습니다.
     */
    override fun createReactActivityDelegate(): ReactActivityDelegate =
        object : DefaultReactActivityDelegate(this, PLACEHOLDER_COMPONENT_NAME, false) {

            override fun getMainComponentName(): String =
                intent.getStringExtra(EXTRA_MODULE_NAME)
                    ?: error("moduleName 없이 RnHostActivity 를 띄웠습니다.")

            /**
             * 여기서 돌려주는 Bundle 이 JS 컴포넌트의 props 로 들어갑니다.
             *
             * 주의할 점 두 가지.
             * 1. 화면을 띄우는 순간 한 번만 전달됩니다. 이후 값이 바뀌어도 반영되지 않습니다.
             * 2. Bundle 이라 원시 타입과 문자열, 배열 정도만 넘어갑니다.
             *    객체를 넘기고 싶으면 JSON 문자열로 만들거나, 네이티브 모듈로 조회하게 합니다.
             */
            override fun getLaunchOptions(): Bundle? =
                intent.getBundleExtra(EXTRA_INITIAL_PROPS)
        }

    companion object {
        private const val EXTRA_MODULE_NAME = "extra_module_name"
        private const val EXTRA_INITIAL_PROPS = "extra_initial_props"

        /**
         * DefaultReactActivityDelegate 생성자가 moduleName 을 요구하는데,
         * 위에서 getMainComponentName() 을 오버라이드해서 실제로는 쓰이지 않습니다.
         */
        private const val PLACEHOLDER_COMPONENT_NAME = ""

        /** index.js 의 AppRegistry.registerComponent 이름과 반드시 같아야 합니다. */
        const val MODULE_PRODUCT_DETAIL = "RNProductDetail"
        const val MODULE_SETTINGS = "RNSettings"

        fun intentFor(
            context: Context,
            moduleName: String,
            initialProps: Bundle = Bundle(),
        ): Intent = Intent(context, RnHostActivity::class.java).apply {
            putExtra(EXTRA_MODULE_NAME, moduleName)
            putExtra(EXTRA_INITIAL_PROPS, initialProps)
        }
    }
}
