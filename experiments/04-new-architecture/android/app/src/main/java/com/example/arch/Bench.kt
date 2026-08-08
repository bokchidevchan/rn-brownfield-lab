package com.example.arch

import android.os.SystemClock
import android.util.Log

/**
 * 03 번의 계측기를 서피스 여러 개를 다룰 수 있게 고친 것입니다.
 *
 * 03 번은 화면 하나가 한 번 신호를 보내면 끝이었습니다. 여기서는 한 화면에
 * 서피스가 둘일 수 있어서, 시작 시각을 지우지 않고 각 서피스가 자기 태그로
 * 따로 보고합니다.
 *
 *   dual_detail=246   첫 서피스가 그려지기까지
 *   dual_review=61    같은 시작점에서 두 번째 서피스가 그려지기까지
 *
 * 둘의 차이가 "엔진이 떠 있을 때 서피스 하나 더 얹는 비용"입니다.
 */
object Bench {

    const val TAG = "BENCH"

    @Volatile
    private var startedAt: Long = 0

    @Volatile
    private var label: String = ""

    /** 서피스가 그려진 시점을 네이티브가 이어받아 다음 동작을 걸 때 씁니다. */
    @Volatile
    var onPaint: ((String) -> Unit)? = null

    fun start(label: String) {
        this.label = label
        this.startedAt = SystemClock.elapsedRealtime()
    }

    /** 서피스가 화면에 나간 직후 JS 가 태그와 함께 알려 옵니다. */
    fun firstPaint(tag: String): Long {
        if (startedAt == 0L) return -1
        val elapsed = SystemClock.elapsedRealtime() - startedAt
        Log.i(TAG, "${label}_$tag=$elapsed")
        onPaint?.invoke(tag)
        return elapsed
    }

    fun log(message: String) {
        Log.i(TAG, message)
    }
}
