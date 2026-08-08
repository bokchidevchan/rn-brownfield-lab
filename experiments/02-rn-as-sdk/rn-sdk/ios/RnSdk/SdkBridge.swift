import Foundation
// React 는 SDK 내부 구현에만 씁니다. 공개 API 는 UIKit/Foundation 타입만 노출합니다.
// 일반 import 로 두면 BUILD_LIBRARY_FOR_DISTRIBUTION 이 만드는 .swiftinterface 에
// `import React` 가 그대로 실려 나가고, React 모듈이 없는 소비 앱에서
// "no such module 'React'" 로 빌드가 깨집니다.
@_implementationOnly import React

/// Android 의 SdkBridgeModule 과 이름을 맞췄습니다(`RnSdkBridge`).
/// JS 쪽 js/native/SdkBridge.js 가 두 플랫폼에서 이 이름으로 찾습니다.
@objc(RnSdkBridge)
final class SdkBridge: RCTEventEmitter {

    private static let themeChangedEvent = "themeChanged"
    private var isObserving = false

    override static func requiresMainQueueSetup() -> Bool { false }

    override func supportedEvents() -> [String]! { [Self.themeChangedEvent] }

    override func startObserving() {
        isObserving = true
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleThemeChanged(_:)),
            name: SdkReactHost.themeChangedNotification,
            object: nil
        )
    }

    override func stopObserving() {
        isObserving = false
        NotificationCenter.default.removeObserver(
            self,
            name: SdkReactHost.themeChangedNotification,
            object: nil
        )
    }

    @objc private func handleThemeChanged(_ notification: Notification) {
        guard isObserving, let theme = notification.userInfo?["theme"] as? String else { return }
        sendEvent(withName: Self.themeChangedEvent, body: ["theme": theme])
    }

    @objc func close() {
        SdkScreenCoordinator.shared.close()
    }

    @objc func finishWithResult(_ result: NSDictionary) {
        SdkScreenCoordinator.shared.finish(
            with: RnSdk.CartResult(
                productId: result["productId"] as? String ?? "",
                action: result["action"] as? String ?? ""
            )
        )
    }

    @objc func getHostInfo(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        let config = SdkReactHost.shared.hostConfig
        resolve([
            "appName": config.appName,
            "appVersion": config.appVersion,
            "platform": "ios",
        ])
    }
}
