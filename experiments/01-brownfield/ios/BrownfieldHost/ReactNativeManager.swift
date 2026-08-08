import Foundation

// RN 헤더는 BrownfieldHost-Bridging-Header.h 를 통해 들어옵니다.
// `import React` 를 쓰지 않는 이유는 그 파일 주석에 적어 뒀습니다.

/// iOS 쪽 `ReactNativeHost` 에 해당합니다. 앱 전체에서 RCTBridge 하나를 들고 있습니다.
///
/// 안드로이드와 다른 점: RN 은 iOS 에 `ReactNativeHost` 같은 기성 클래스를 주지 않습니다.
/// 그린필드 템플릿은 AppDelegate 가 `RCTAppDelegate` 를 상속해서 이 역할을 대신하는데,
/// 브라운필드에서는 기존 앱의 AppDelegate 를 그렇게 바꾸기 어렵습니다.
/// 그래서 브리지를 들고 있는 객체를 따로 두는 게 사실상 표준 패턴입니다.
final class ReactNativeManager: NSObject {

    static let shared = ReactNativeManager()

    /// RN 인스턴스를 언제 만들 것인가. 안드로이드의 `HostApplication.PRELOAD_REACT_INSTANCE` 와 짝입니다.
    ///
    /// false: 첫 RN 화면 진입 때 만듭니다.
    /// true : `application(_:didFinishLaunchingWithOptions:)` 에서 미리 만듭니다.
    static let preloadOnLaunch = false

    private var _bridge: RCTBridge?

    private override init() {
        super.init()
    }

    /// 브리지가 없으면 이 시점에 만듭니다. 첫 호출이 비싼 쪽입니다.
    var bridge: RCTBridge {
        if let existing = _bridge {
            return existing
        }
        let created = RCTBridge(delegate: self, launchOptions: nil)!
        _bridge = created
        return created
    }

    /// 이미 만들어졌는지만 확인합니다. 이벤트를 보낼지 말지 판단할 때 씁니다.
    var isBridgeCreated: Bool { _bridge != nil }

    func preloadIfNeeded() {
        guard Self.preloadOnLaunch else { return }
        _ = bridge
    }
}

extension ReactNativeManager: RCTBridgeDelegate {

    /// JS 번들을 어디서 가져올지 정합니다. 브라운필드에서 실수하기 쉬운 지점입니다.
    ///
    /// - 디버그: Metro(http://localhost:8081)에 붙습니다.
    /// - 릴리스: 앱 번들 안의 main.jsbundle 을 읽습니다.
    ///   `npm run bundle:ios` 로 만든 파일이 타깃에 포함돼 있어야 합니다.
    ///   Podfile 의 use_react_native! 이 걸어 주는 "Bundle React Native code and images"
    ///   빌드 페이즈가 릴리스 빌드에서 이 작업을 대신합니다.
    func sourceURL(for bridge: RCTBridge!) -> URL! {
        #if DEBUG
        return RCTBundleURLProvider.sharedSettings()
            .jsBundleURL(forBundleRoot: "index")
        #else
        return Bundle.main.url(forResource: "main", withExtension: "jsbundle")
        #endif
    }
}
