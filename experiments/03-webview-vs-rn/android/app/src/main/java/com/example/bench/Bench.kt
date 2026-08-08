package com.example.bench

import android.os.SystemClock
import android.util.Log

/**
 * 두 방식을 같은 자로 재기 위한 계측기.
 *
 * 측정 정의를 한 곳에 고정합니다.
 *   시작: 네이티브가 화면 전환을 시작한 시각 (사용자가 버튼을 누른 순간)
 *   끝  : 그 화면의 콘텐츠가 실제로 화면에 그려진 직후, JS 가 알려 온 시각
 *
 * 웹뷰는 requestAnimationFrame 두 번, RN 은 InteractionManager 뒤 rAF 두 번에서
 * 신호를 보냅니다. 둘 다 "이 프레임이 나간 다음"이라는 같은 뜻입니다.
 *
 * onPageFinished 나 컴포넌트 mount 를 끝점으로 잡으면 두 방식의 정의가 어긋납니다.
 * 그러면 숫자를 비교할 수 없습니다.
 */
object Bench {

    const val TAG = "BENCH"

    @Volatile
    private var startedAt: Long = 0

    @Volatile
    private var label: String = ""

    @Volatile
    var onMeasured: ((Long) -> Unit)? = null

    /** 화면 전환 직전에 부릅니다. */
    fun start(label: String) {
        this.label = label
        this.startedAt = SystemClock.elapsedRealtime()
    }

    /** 콘텐츠가 화면에 나간 직후 JS 가 알려 오면 부릅니다. 측정값(ms)을 돌려줍니다. */
    fun firstPaint(): Long {
        if (startedAt == 0L) return -1
        val elapsed = SystemClock.elapsedRealtime() - startedAt
        startedAt = 0
        // adb logcat 으로 긁어서 통계를 냅니다. 화면을 눈으로 읽는 것보다 정확하고 반복이 됩니다.
        Log.i(TAG, "$label=$elapsed")
        onMeasured?.invoke(elapsed)
        return elapsed
    }

    fun log(message: String) {
        Log.i(TAG, message)
    }
}
