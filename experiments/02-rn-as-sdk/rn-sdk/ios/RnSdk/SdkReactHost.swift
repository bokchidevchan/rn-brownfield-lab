import Foundation
// React 는 SDK 내부 구현에만 씁니다. 공개 API 는 UIKit/Foundation 타입만 노출합니다.
// 일반 import 로 두면 BUILD_LIBRARY_FOR_DISTRIBUTION 이 만드는 .swiftinterface 에
// `import React` 가 그대로 실려 나가고, React 모듈이 없는 소비 앱에서
// "no such module 'React'" 로 빌드가 깨집니다.
@_implementationOnly import React

/// 01 번의 ReactNativeManager 를 SDK 안으로 옮긴 것입니다.
///
/// 달라진 점 하나. 01 번은 릴리스에서 `Bundle.main` 에서 번들을 찾았습니다.
/// SDK 는 앱 번들이 아니라 자기 리소스 번들에서 찾아야 합니다.
/// 소비 앱의 메인 번들에 번들 파일을 넣으라고 요구하면 SDK 가 아니게 됩니다.
final class SdkReactHost: NSObject {

    static let shared = SdkReactHost()

    static let moduleProductDetail = "RNProductDetail"
    static let moduleSettings = "RNSettings"
    static let themeChangedNotification = Notification.Name("com.example.rnsdk.themeChanged")

    private var config: RnSdk.Config?
    private var _bridge: RCTBridge?

    var resultListener: ((RnSdk.CartResult) -> Void)?

    private override init() { super.init() }

    func initialize(config: RnSdk.Config) {
        self.config = config
        if config.preloadOnInit {
            _ = bridge
        }
    }

    var hostConfig: RnSdk.Config {
        guard let config else {
            fatalError("RnSdk.initialize(_:) 를 먼저 불러야 합니다.")
        }
        return config
    }

    var bridge: RCTBridge {
        if let existing = _bridge { return existing }
        let created = RCTBridge(delegate: self, launchOptions: nil)!
        _bridge = created
        return created
    }

    var isCreated: Bool { _bridge != nil }

    func destroy() {
        _bridge?.invalidate()
        _bridge = nil
    }

    /// SDK 코드가 들어 있는 번들. 리소스를 여기서 찾습니다.
    /// 정적 라이브러리로 링크되면 mainBundle 이 되고, 프레임워크면 프레임워크 번들이 됩니다.
    /// 그래서 클래스 기준으로 찾습니다.
    static var resourceBundle: Bundle {
        let base = Bundle(for: SdkReactHost.self)
        // CocoaPods 가 resource_bundles 로 감싸는 경우를 함께 다룹니다.
        if let url = base.url(forResource: "RnSdkResources", withExtension: "bundle"),
           let nested = Bundle(url: url) {
            return nested
        }
        return base
    }
}

extension SdkReactHost: RCTBridgeDelegate {

    func sourceURL(for bridge: RCTBridge!) -> URL! {
        if hostConfig.useDeveloperSupport {
            return RCTBundleURLProvider.sharedSettings()
                .jsBundleURL(forBundleRoot: "index")
        }
        guard let url = Self.resourceBundle.url(forResource: "main", withExtension: "jsbundle") else {
            fatalError(
                "SDK 리소스에서 main.jsbundle 을 찾지 못했습니다. " +
                "SDK 를 빌드하기 전에 npm run bundle:ios 를 돌렸는지 확인하세요."
            )
        }
        return url
    }
}
