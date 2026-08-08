package com.example.mf

import com.facebook.react.ReactActivity
import com.facebook.react.ReactActivityDelegate
import com.facebook.react.defaults.DefaultReactActivityDelegate

/**
 * 호스트 셸을 띄웁니다. 화면 하나짜리라 01 번보다 단순합니다.
 *
 * 이 실험의 관심사는 진입점 구조가 아니라 번들이 어떻게 쪼개지고
 * 런타임에 무엇을 받아 오는가입니다.
 */
class MainActivity : ReactActivity() {

    override fun getMainComponentName(): String = "HostApp"

    override fun createReactActivityDelegate(): ReactActivityDelegate =
        DefaultReactActivityDelegate(this, mainComponentName, false)
}
