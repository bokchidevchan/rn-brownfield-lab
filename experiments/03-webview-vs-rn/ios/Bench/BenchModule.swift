import Foundation

/// 웹뷰 쪽 WKScriptMessageHandler 와 같은 기능입니다.
/// 저쪽은 문자열 type 으로 분기하는 switch 문이고, 여기는 메서드 셋입니다.
@objc(Bench)
final class BenchModule: NSObject {

    @objc static func requiresMainQueueSetup() -> Bool { false }

    /// 측정값을 Promise 로 그대로 돌려줍니다.
    /// 웹뷰 쪽은 같은 일을 하려고 evaluateJavaScript 로 문자열을 주입했습니다.
    @objc func reportFirstPaint(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        resolve(Bench.firstPaint())
    }

    @objc func getHostInfo(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        let version = Bundle.main
            .object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String ?? "0"
        resolve(["appVersion": version, "platform": "ios"])
    }

    @objc func finishWithResult(_ result: NSDictionary) {
        BenchCoordinator.shared.finish(
            productId: result["productId"] as? String ?? "",
            action: result["action"] as? String ?? ""
        )
    }
}
