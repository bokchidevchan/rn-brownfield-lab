import UIKit

/// iOS SDK 의 공개 API. Android 의 `RnSdk` 오브젝트와 표면을 맞췄습니다.
///
/// 소비 앱에서 사라지는 것들이 Android 와 같습니다.
///
///   RCTBridge 생성과 보관        → SDK 내부
///   RCTBridgeDelegate 구현        → SDK 내부
///   sourceURL 분기(Metro vs 번들) → SDK 내부
///   RCTRootView, moduleName       → 타입과 문자열이 노출되지 않음
///
/// 소비 앱 코드에 `React` 를 import 하는 줄이 없습니다.
public final class RnSdk {

    /// 소비 앱이 자기를 소개하는 값입니다.
    public struct Config {
        public let appName: String
        public let appVersion: String
        /// Metro 에 붙어 개발할 때만 true. 배포 빌드는 false 로 두고 내장 번들을 씁니다.
        public let useDeveloperSupport: Bool
        /// true 면 initialize 시점에 RN 인스턴스를 미리 만듭니다.
        public let preloadOnInit: Bool

        public init(
            appName: String,
            appVersion: String,
            useDeveloperSupport: Bool = false,
            preloadOnInit: Bool = false
        ) {
            self.appName = appName
            self.appVersion = appVersion
            self.useDeveloperSupport = useDeveloperSupport
            self.preloadOnInit = preloadOnInit
        }
    }

    /// RN 화면이 돌려주는 결과. RN 의 타입이 아니라 SDK 가 정의한 타입입니다.
    public struct CartResult {
        public let productId: String
        public let action: String
    }

    /// 앱 시작 시 한 번 부릅니다.
    public static func initialize(_ config: Config) {
        SdkReactHost.shared.initialize(config: config)
    }

    /// 상품 상세를 네비게이션 스택에 push 합니다.
    /// 네비게이션 소유권은 소비 앱에 남겨 둡니다. SDK 가 present 방식을 강제하지 않습니다.
    public static func productDetailViewController(productId: String) -> UIViewController {
        RnSdkViewController(
            moduleName: SdkReactHost.moduleProductDetail,
            initialProperties: [
                "productId": productId,
                "launchedAtMs": Date().timeIntervalSince1970 * 1000,
            ]
        )
    }

    /// 설정 화면을 UIView 하나로 돌려줍니다. 소비 앱은 원하는 곳에 addSubview 하면 됩니다.
    /// 돌려주는 타입이 RCTRootView 가 아니라 UIView 입니다.
    public static func makeSettingsView(userTier: String = "FREE") -> UIView {
        RnSdkView(
            moduleName: SdkReactHost.moduleSettings,
            initialProperties: ["userTier": userTier]
        )
    }

    /// 소비 앱에서 RN 화면으로 테마 변경을 알립니다.
    public static func notifyThemeChanged(_ theme: String) {
        NotificationCenter.default.post(
            name: SdkReactHost.themeChangedNotification,
            object: nil,
            userInfo: ["theme": theme]
        )
    }

    /// RN 화면이 결과를 돌려줄 때 호출됩니다.
    public static var resultListener: ((CartResult) -> Void)? {
        get { SdkReactHost.shared.resultListener }
        set { SdkReactHost.shared.resultListener = newValue }
    }

    /// RN 인스턴스를 파괴합니다. 다음 화면 진입에서 다시 만들어집니다.
    public static func releaseMemory() {
        SdkReactHost.shared.destroy()
    }

    /// 지금 RN 인스턴스가 살아 있는지. 측정과 디버깅용입니다.
    public static var isRunning: Bool { SdkReactHost.shared.isCreated }
}
