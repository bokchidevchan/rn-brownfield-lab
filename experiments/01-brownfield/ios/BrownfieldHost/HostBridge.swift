import Foundation

/// 안드로이드의 HostBridgeModule 과 같은 역할, 같은 이름(`HostBridge`)입니다.
/// JS 쪽 js/native/HostBridge.js 가 두 플랫폼 모두 이 이름으로 찾습니다.
///
/// RCTEventEmitter 를 상속하면 addListener/removeListeners 가 딸려 옵니다.
/// 안드로이드에서는 그 두 개를 직접 빈 메서드로 만들어야 했던 부분입니다.
@objc(HostBridge)
final class HostBridge: RCTEventEmitter {

    private static let themeChangedEvent = "hostThemeChanged"

    private var isObserving = false

    override static func requiresMainQueueSetup() -> Bool {
        // 초기화 시점에 UIKit 을 건드리지 않으므로 백그라운드 초기화를 허용합니다.
        // true 로 두면 앱 시작 경로에서 메인 스레드를 잡아 콜드 스타트가 느려집니다.
        false
    }

    override func supportedEvents() -> [String]! {
        [Self.themeChangedEvent]
    }

    /// JS 에 리스너가 하나라도 붙었을 때만 호출됩니다.
    /// 리스너가 없는데 sendEvent 를 부르면 RN 이 경고를 냅니다.
    override func startObserving() {
        isObserving = true
        NotificationCenter.default.addObserver(
            self,
            selector: #selector(handleThemeChanged(_:)),
            name: .hostThemeChanged,
            object: nil
        )
    }

    override func stopObserving() {
        isObserving = false
        NotificationCenter.default.removeObserver(self, name: .hostThemeChanged, object: nil)
    }

    @objc private func handleThemeChanged(_ notification: Notification) {
        guard isObserving,
              let theme = notification.userInfo?["theme"] as? String else { return }
        sendEvent(withName: Self.themeChangedEvent, body: ["theme": theme])
    }

    @objc func closeScreen() {
        RnScreenPresenter.shared.close()
    }

    @objc func finishWithResult(_ result: NSDictionary) {
        RnScreenPresenter.shared.finish(
            with: RnScreenPresenter.Result(
                productId: result["productId"] as? String ?? "",
                action: result["action"] as? String ?? ""
            )
        )
    }

    @objc func getHostInfo(
        _ resolve: @escaping RCTPromiseResolveBlock,
        rejecter reject: @escaping RCTPromiseRejectBlock
    ) {
        let version = Bundle.main
            .object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String
        #if DEBUG
        let isDebug = true
        #else
        let isDebug = false
        #endif
        resolve([
            "appVersion": version ?? "unknown",
            "platform": "ios",
            "isDebug": isDebug,
        ])
    }
}
