import Foundation

/// RN 인스턴스를 들고 있습니다. 01 번과 같은 구조입니다.
final class ReactNativeManager: NSObject {

    static let shared = ReactNativeManager()

    private var _bridge: RCTBridge?

    private override init() { super.init() }

    var bridge: RCTBridge {
        if let existing = _bridge { return existing }
        let created = RCTBridge(delegate: self, launchOptions: nil)!
        _bridge = created
        return created
    }

    var isCreated: Bool { _bridge != nil }

    /// 웹뷰 프리워밍과 짝이 되는 동작입니다. 런타임만 미리 만들고 렌더는 진입 때 합니다.
    func preload() {
        _ = bridge
        Bench.log("rn_warmup_started")
    }

    func destroy() {
        _bridge?.invalidate()
        _bridge = nil
    }
}

extension ReactNativeManager: RCTBridgeDelegate {

    func sourceURL(for bridge: RCTBridge!) -> URL! {
        // Metro 를 안 씁니다. 웹뷰와 조건을 맞추려면 번들이 앱 안에 있어야 합니다.
        // Metro 를 붙이면 RN 만 네트워크를 타서 비교가 깨집니다.
        guard let url = Bundle.main.url(forResource: "main", withExtension: "jsbundle") else {
            fatalError("main.jsbundle 이 없습니다. npm run bundle:ios 를 먼저 돌리세요.")
        }
        return url
    }
}
