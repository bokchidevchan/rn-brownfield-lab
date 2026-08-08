import Foundation

/// Android 의 Bench.kt 와 같은 자입니다.
///
/// 다른 점은 결과를 내보내는 경로입니다. Android 는 logcat 에 남기고 adb 로 긁었습니다.
/// iOS 시뮬레이터는 창을 GUI 로 자동화하기 어려워서, stdout 으로 찍고
/// `xcrun simctl launch --console-pty` 로 받습니다.
enum Bench {

    private static var startedAt: CFAbsoluteTime = 0
    private static var label: String = ""

    /// 화면 전환 직전에 부릅니다.
    static func start(_ label: String) {
        self.label = label
        self.startedAt = CFAbsoluteTimeGetCurrent()
    }

    /// 콘텐츠가 화면에 나간 직후 JS 가 알려 오면 부릅니다. 측정값(ms)을 돌려줍니다.
    @discardableResult
    static func firstPaint() -> Int {
        guard startedAt != 0 else { return -1 }
        let elapsed = Int(((CFAbsoluteTimeGetCurrent() - startedAt) * 1000).rounded())
        startedAt = 0
        print("BENCH \(label)=\(elapsed)")
        return elapsed
    }

    static func log(_ message: String) {
        print("BENCH \(message)")
    }
}
